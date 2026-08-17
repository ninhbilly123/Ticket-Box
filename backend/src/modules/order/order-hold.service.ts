import { Prisma } from '@prisma/client';
import type { OrderStatus } from '@prisma/client';
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../shared/modules/prisma.service';
import { AppError } from '../../shared/lib/errors';
import { invalidateTicketAvailabilityCache } from '../concert/concert-detail-cache';
import { WaitingRoomService } from '../concert/waiting-room.service';
import { getOrderHoldTtlMs, getOrderHoldTtlSeconds, publishOrderExpirationJob } from './order-expiration';
import {
  PAID_ORDER_STATUSES,
  PENDING_ORDER_STATUSES,
  PUBLIC_CONCERT_STATUSES,
} from '../../shared/domain/statuses';

interface HoldOrderItemInput {
  ticketTypeId: string;
  quantity: number;
}

interface HoldOrderInput {
  userId: string;
  concertId: string;
  idempotencyKey: string;
  checkoutToken?: string;
  items: HoldOrderItemInput[];
}

interface LockedInventoryRow {
  ticketTypeId: string;
  totalQuantity: number;
  availableQuantity: number;
  reservedQuantity: number;
  soldQuantity: number;
}

@Injectable()
export class OrderHoldService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly waitingRoomService: WaitingRoomService
  ) {}
  public async holdOrder(input: HoldOrderInput) {
    const normalizedIdempotencyKey = input.idempotencyKey.trim();
    if (!normalizedIdempotencyKey) {
      throw new AppError(400, 'MISSING_IDEMPOTENCY_KEY', 'Idempotency-Key là bắt buộc.');
    }

    const items = this.normalizeItems(input.items);
    const existing = await this.findOrderByIdempotencyKey(normalizedIdempotencyKey);
    if (existing) {
      return this.handleExistingIdempotencyOrder(existing, input.userId);
    }

    await this.waitingRoomService.consumeCheckoutTokenForHold(input.concertId, input.userId, input.checkoutToken);

    try {
      const order = await this.prisma.$transaction(async (tx) => {
        const now = new Date();
        const concert = await tx.concert.findFirst({
          where: {
            id: input.concertId,
            status: { in: PUBLIC_CONCERT_STATUSES },
          },
          select: {
            id: true,
            saleOpenAt: true,
          },
        });

        if (!concert) {
          throw new AppError(404, 'CONCERT_NOT_AVAILABLE', 'Concert không khả dụng để đặt vé.');
        }

        if (concert.saleOpenAt && now < concert.saleOpenAt) {
          throw new AppError(400, 'SALE_NOT_STARTED', 'Concert chưa mở bán.');
        }

        const orderItems: Array<{
          ticketTypeId: string;
          ticketTypeName: string;
          quantity: number;
          unitPrice: number;
        }> = [];
        let totalAmount = 0;
        const activePendingSince = new Date(now.getTime() - getOrderHoldTtlMs());

        for (const item of items) {
          const ticketType = await tx.ticketType.findUnique({
            where: { id: item.ticketTypeId },
            select: {
              id: true,
              concertId: true,
              name: true,
              price: true,
              maxPerAccount: true,
              saleOpenAt: true,
              saleCloseAt: true,
              status: true,
            },
          });

          if (!ticketType || ticketType.concertId !== input.concertId) {
            throw new AppError(404, 'TICKET_TYPE_NOT_FOUND', 'Không tìm thấy loại vé yêu cầu.');
          }

          if (ticketType.status !== 'ACTIVE') {
            throw new AppError(400, 'CONCERT_NOT_AVAILABLE', 'Loại vé không khả dụng để đặt.');
          }

          if (ticketType.saleOpenAt && now < ticketType.saleOpenAt) {
            throw new AppError(400, 'SALE_NOT_STARTED', 'Loại vé này chưa mở bán.');
          }

          if (ticketType.saleCloseAt && now > ticketType.saleCloseAt) {
            throw new AppError(400, 'SALE_ENDED', 'Loại vé này đã đóng bán.');
          }

          const inventory = await this.lockInventory(tx, item.ticketTypeId);
          if (!inventory) {
            throw new AppError(404, 'TICKET_TYPE_NOT_FOUND', 'Không tìm thấy tồn kho của loại vé yêu cầu.');
          }

          const alreadyHeldOrPaid = await this.countUserActiveQuantity(
            tx,
            input.userId,
            input.concertId,
            item.ticketTypeId,
            activePendingSince
          );

          if (alreadyHeldOrPaid + item.quantity > ticketType.maxPerAccount) {
            throw new AppError(
              400,
              'USER_TICKET_LIMIT_EXCEEDED',
              `Bạn chỉ được giữ/mua tối đa ${ticketType.maxPerAccount} vé cho loại vé này.`
            );
          }

          if (inventory.availableQuantity < item.quantity) {
            throw new AppError(400, 'TICKET_SOLD_OUT', 'Loại vé này đã hết.');
          }

          await tx.ticketInventory.update({
            where: { ticketTypeId: item.ticketTypeId },
            data: {
              availableQuantity: inventory.availableQuantity - item.quantity,
              reservedQuantity: inventory.reservedQuantity + item.quantity,
            },
          });

          await tx.ticketType.update({
            where: { id: item.ticketTypeId },
            data: {
              reservedQuantity: { increment: item.quantity },
            },
          });

          const unitPrice = Number(ticketType.price);
          totalAmount += unitPrice * item.quantity;
          orderItems.push({
            ticketTypeId: ticketType.id,
            ticketTypeName: ticketType.name,
            quantity: item.quantity,
            unitPrice,
          });
        }

        const order = await tx.order.create({
          data: {
            userId: input.userId,
            concertId: input.concertId,
            status: 'pending',
            totalAmount,
            idempotencyKey: normalizedIdempotencyKey,
          },
        });

        await tx.orderItem.createMany({
          data: orderItems.map((item) => ({
            orderId: order.id,
            ticketTypeId: item.ticketTypeId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
          })),
        });

        return {
          id: order.id,
          status: order.status,
          totalAmount: Number(order.totalAmount),
          createdAt: order.createdAt,
          items: orderItems,
        };
      });

      await publishOrderExpirationJob(order.id, getOrderHoldTtlMs());
      await invalidateTicketAvailabilityCache(input.concertId, 'order.hold');

      return this.toHoldResponse(order);
    } catch (error) {
      if (this.isUniqueIdempotencyError(error)) {
        const duplicated = await this.findOrderByIdempotencyKey(normalizedIdempotencyKey);
        if (duplicated) {
          return this.handleExistingIdempotencyOrder(duplicated, input.userId);
        }
      }
      throw error;
    }
  }

  public async expireOrderIfDue(orderId: string, now = new Date()) {
    return this.prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({
        where: { id: orderId },
        include: {
          orderItems: true,
        },
      });

      if (!order) {
        throw new AppError(404, 'ORDER_NOT_FOUND', 'Không tìm thấy đơn hàng.');
      }

      if (PAID_ORDER_STATUSES.includes(order.status)) {
        return { result: 'skipped_paid' as const, orderId: order.id, concertId: order.concertId };
      }

      if (!PENDING_ORDER_STATUSES.includes(order.status)) {
        return { result: 'skipped_not_pending' as const, orderId: order.id, concertId: order.concertId };
      }

      const expiresAt = new Date(order.createdAt.getTime() + getOrderHoldTtlMs());
      if (now < expiresAt) {
        return {
          result: 'not_due' as const,
          orderId: order.id,
          concertId: order.concertId,
          remainingMs: expiresAt.getTime() - now.getTime(),
        };
      }

      await tx.order.update({
        where: { id: order.id },
        data: { status: 'expired' },
      });

      for (const item of order.orderItems) {
        const inventory = await this.lockInventory(tx, item.ticketTypeId);
        if (!inventory) continue;

        const releaseQuantity = Math.min(inventory.reservedQuantity, item.quantity);
        if (releaseQuantity > 0) {
          await tx.ticketInventory.update({
            where: { ticketTypeId: item.ticketTypeId },
            data: {
              availableQuantity: inventory.availableQuantity + releaseQuantity,
              reservedQuantity: inventory.reservedQuantity - releaseQuantity,
            },
          });

          await tx.ticketType.update({
            where: { id: item.ticketTypeId },
            data: {
              reservedQuantity: { decrement: releaseQuantity },
            },
          });
        }
      }

      await tx.ticket.deleteMany({
        where: {
          orderItem: {
            orderId: order.id,
          },
        },
      });

      return { result: 'expired' as const, orderId: order.id, concertId: order.concertId };
    });
  }

  public async expireOldPendingOrders() {
    const cutoff = new Date(Date.now() - getOrderHoldTtlMs());
    const orders = await this.prisma.order.findMany({
      where: {
        status: { in: PENDING_ORDER_STATUSES },
        createdAt: { lt: cutoff },
      },
      select: { id: true },
    });

    const results = [];
    for (const order of orders) {
      results.push(await this.expireOrderIfDue(order.id));
    }
    return results;
  }

  private normalizeItems(items: HoldOrderItemInput[]) {
    if (!Array.isArray(items) || items.length === 0) {
      throw new AppError(400, 'INVALID_QUANTITY', 'Cần chọn ít nhất một loại vé.');
    }

    const grouped = new Map<string, number>();
    for (const item of items) {
      const ticketTypeId = String(item.ticketTypeId || '').trim();
      const quantity = Number(item.quantity);
      if (!ticketTypeId || !Number.isInteger(quantity) || quantity <= 0) {
        throw new AppError(400, 'INVALID_QUANTITY', 'Số lượng vé giữ phải là số nguyên dương.');
      }
      grouped.set(ticketTypeId, (grouped.get(ticketTypeId) || 0) + quantity);
    }

    return Array.from(grouped.entries())
      .map(([ticketTypeId, quantity]) => ({ ticketTypeId, quantity }))
      .sort((a, b) => a.ticketTypeId.localeCompare(b.ticketTypeId));
  }

  private async findOrderByIdempotencyKey(idempotencyKey: string) {
    return this.prisma.order.findUnique({
      where: { idempotencyKey },
      include: {
        orderItems: {
          include: {
            ticketType: {
              select: { id: true, name: true, price: true },
            },
          },
        },
      },
    });
  }

  private handleExistingIdempotencyOrder(order: Awaited<ReturnType<OrderHoldService['findOrderByIdempotencyKey']>>, userId: string) {
    if (!order || order.userId !== userId || ![...PENDING_ORDER_STATUSES, ...PAID_ORDER_STATUSES].includes(order.status)) {
      throw new AppError(409, 'ORDER_HOLD_DUPLICATED', 'Idempotency-Key đã được sử dụng cho một yêu cầu khác.');
    }

    return this.toHoldResponse({
      id: order.id,
      status: order.status,
      totalAmount: Number(order.totalAmount),
      createdAt: order.createdAt,
      items: order.orderItems.map((item) => ({
        ticketTypeId: item.ticketTypeId,
        ticketTypeName: item.ticketType.name,
        quantity: item.quantity,
        unitPrice: Number(item.unitPrice),
      })),
    });
  }

  private async lockInventory(tx: Prisma.TransactionClient, ticketTypeId: string): Promise<LockedInventoryRow | null> {
    const rows = await tx.$queryRaw<LockedInventoryRow[]>`
      SELECT
        ticket_type_id as "ticketTypeId",
        total_quantity as "totalQuantity",
        available_quantity as "availableQuantity",
        reserved_quantity as "reservedQuantity",
        sold_quantity as "soldQuantity"
      FROM ticket_inventory
      WHERE ticket_type_id = ${ticketTypeId}::uuid
      FOR UPDATE
    `;
    return rows[0] || null;
  }

  private async countUserActiveQuantity(
    tx: Prisma.TransactionClient,
    userId: string,
    concertId: string,
    ticketTypeId: string,
    activePendingSince: Date
  ) {
    const result = await tx.orderItem.aggregate({
      _sum: { quantity: true },
      where: {
        ticketTypeId,
        order: {
          userId,
          concertId,
          OR: [
            { status: { in: PAID_ORDER_STATUSES } },
            {
              status: { in: PENDING_ORDER_STATUSES },
              createdAt: { gte: activePendingSince },
            },
          ],
        },
      },
    });
    return result._sum.quantity || 0;
  }

  private toHoldResponse(order: {
    id: string;
    status: OrderStatus;
    totalAmount: number;
    createdAt: Date;
    items: Array<{ ticketTypeId: string; ticketTypeName: string; quantity: number; unitPrice: number }>;
  }) {
    const expiresAt = new Date(order.createdAt.getTime() + getOrderHoldTtlMs());
    const expiresInSeconds = Math.max(0, Math.ceil((expiresAt.getTime() - Date.now()) / 1000));
    const isAwaitingPayment = PENDING_ORDER_STATUSES.includes(order.status);

    return {
      orderId: order.id,
      totalAmount: order.totalAmount,
      orderStatus: isAwaitingPayment ? 'AWAITING_PAYMENT' : order.status.toUpperCase(),
      expiresAt: expiresAt.toISOString(),
      expiresInSeconds: isAwaitingPayment ? Math.min(getOrderHoldTtlSeconds(), expiresInSeconds) : 0,
      items: order.items,
    };
  }

  private isUniqueIdempotencyError(error: unknown) {
    return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
  }
}


