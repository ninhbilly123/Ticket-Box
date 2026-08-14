import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { AppError } from '../../shared/lib/errors';
import { AuthUser } from '../../shared/types/auth';
import { PrismaService } from '../../shared/modules/prisma.service';
import { assertZoneCode } from '../../shared/lib/seat-map-svg';
import { publishConcertListingInvalidation } from '../concert/concert-listing-events';
import { AdminConcertAccessService } from './admin-concert-access.service';

export interface TicketTypeInput {
  name: string;
  zoneCode: string;
  price: number;
  totalQuantity: number;
  maxPerAccount: number;
  saleOpenAt?: string;
  saleCloseAt?: string;
}

export interface TicketTypeUpdateInput {
  name?: string;
  zoneCode?: string;
  price?: number;
  maxPerAccount?: number;
  saleOpenAt?: string | null;
  saleCloseAt?: string | null;
  status?: 'ACTIVE' | 'INACTIVE';
}

@Injectable()
export class AdminTicketTypeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly concertAccess: AdminConcertAccessService
  ) {}

  public async listTicketTypes(user: AuthUser, concertId: string) {
    await this.concertAccess.assertCanManageConcert(user, concertId);
    return this.prisma.ticketType.findMany({
      where: { concertId },
      include: { inventory: true },
      orderBy: { price: 'desc' },
    });
  }

  public async createTicketType(user: AuthUser, concertId: string, input: TicketTypeInput) {
    const concert = await this.concertAccess.assertCanManageConcert(user, concertId);
    this.concertAccess.assertDraft(concert.status);
    const zoneCode = assertZoneCode(input.zoneCode);
    this.validateTicketTypeInput(input, concert);
    await this.assertTicketTypeIdentityAvailable(concertId, input.name, zoneCode);

    const ticketType = await this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const ticketType = await tx.ticketType.create({
        data: {
          concertId,
          name: input.name.trim(),
          zoneCode,
          price: input.price,
          totalQuantity: input.totalQuantity,
          maxPerAccount: input.maxPerAccount,
          saleOpenAt: input.saleOpenAt ? new Date(input.saleOpenAt) : null,
          saleCloseAt: input.saleCloseAt ? new Date(input.saleCloseAt) : null,
          status: 'ACTIVE',
        },
      });

      await tx.ticketInventory.create({
        data: {
          ticketTypeId: ticketType.id,
          totalQuantity: input.totalQuantity,
          availableQuantity: input.totalQuantity,
          reservedQuantity: 0,
          soldQuantity: 0,
        },
      });

      return ticketType;
    });

    await publishConcertListingInvalidation('ticket-type.updated', { concertId, ticketTypeId: ticketType.id });
    return ticketType;
  }

  public async updateTicketType(user: AuthUser, ticketTypeId: string, input: TicketTypeUpdateInput) {
    const ticketType = await this.prisma.ticketType.findUnique({ where: { id: ticketTypeId } });
    if (!ticketType) throw new AppError(404, 'TICKET_TYPE_NOT_FOUND', 'Ticket type not found.');
    const concert = await this.concertAccess.assertCanManageConcert(user, ticketType.concertId);
    this.concertAccess.assertDraft(concert.status);

    const data: Record<string, unknown> = {};
    if (input.name) data.name = input.name.trim();
    if (input.zoneCode) data.zoneCode = assertZoneCode(input.zoneCode);
    if (typeof input.price === 'number') {
      data.price = input.price;
    }
    if (typeof input.maxPerAccount === 'number') {
      if (input.maxPerAccount <= 0) throw new AppError(400, 'TICKET_QUANTITY_INVALID', 'maxPerAccount must be positive.');
      data.maxPerAccount = input.maxPerAccount;
    }
    if (input.saleOpenAt !== undefined) data.saleOpenAt = input.saleOpenAt ? new Date(input.saleOpenAt) : null;
    if (input.saleCloseAt !== undefined) data.saleCloseAt = input.saleCloseAt ? new Date(input.saleCloseAt) : null;
    if (input.status) data.status = input.status;

    const saleOpenAt = input.saleOpenAt !== undefined
      ? (input.saleOpenAt ? new Date(input.saleOpenAt) : null)
      : ticketType.saleOpenAt;
    const saleCloseAt = input.saleCloseAt !== undefined
      ? (input.saleCloseAt ? new Date(input.saleCloseAt) : null)
      : ticketType.saleCloseAt;
    this.validateTicketSaleWindow(saleOpenAt, saleCloseAt, concert);
    await this.assertTicketTypeIdentityAvailable(
      ticketType.concertId,
      (data.name as string | undefined) || ticketType.name,
      (data.zoneCode as string | undefined) || ticketType.zoneCode,
      ticketTypeId
    );

    const updated = await this.prisma.ticketType.update({ where: { id: ticketTypeId }, data });
    await publishConcertListingInvalidation('ticket-type.updated', {
      concertId: ticketType.concertId,
      ticketTypeId,
    });
    return updated;
  }

  public async deleteTicketType(user: AuthUser, ticketTypeId: string) {
    const ticketType = await this.prisma.ticketType.findUnique({ where: { id: ticketTypeId } });
    if (!ticketType) throw new AppError(404, 'TICKET_TYPE_NOT_FOUND', 'Ticket type not found.');
    const concert = await this.concertAccess.assertCanManageConcert(user, ticketType.concertId);
    this.concertAccess.assertDraft(concert.status);

    const soldOrReserved = await this.prisma.ticket.count({
      where: { orderItem: { ticketTypeId } },
    });
    if (soldOrReserved > 0) {
      throw new AppError(400, 'TICKET_QUANTITY_INVALID', 'Ticket type already has issued tickets.');
    }

    await this.prisma.ticketType.delete({ where: { id: ticketTypeId } });
    await publishConcertListingInvalidation('ticket-type.updated', {
      concertId: ticketType.concertId,
      ticketTypeId,
    });
    return { deleted: true };
  }

  public async getInventory(user: AuthUser, ticketTypeId: string) {
    const ticketType = await this.prisma.ticketType.findUnique({
      where: { id: ticketTypeId },
      include: { inventory: true },
    });
    if (!ticketType) throw new AppError(404, 'TICKET_TYPE_NOT_FOUND', 'Ticket type not found.');
    await this.concertAccess.assertCanManageConcert(user, ticketType.concertId);
    return ticketType.inventory || this.deriveInventory(ticketType);
  }

  public async updateInventory(user: AuthUser, ticketTypeId: string, totalQuantity: number) {
    const ticketType = await this.prisma.ticketType.findUnique({
      where: { id: ticketTypeId },
      include: { inventory: true },
    });
    if (!ticketType) throw new AppError(404, 'TICKET_TYPE_NOT_FOUND', 'Ticket type not found.');
    await this.concertAccess.assertCanManageConcert(user, ticketType.concertId);

    const reservedQuantity = ticketType.inventory?.reservedQuantity ?? ticketType.reservedQuantity;
    const soldQuantity = ticketType.inventory?.soldQuantity ?? ticketType.soldQuantity;
    if (totalQuantity < reservedQuantity + soldQuantity) {
      throw new AppError(400, 'TICKET_QUANTITY_INVALID', 'New total quantity cannot be less than sold plus reserved quantity.');
    }

    const inventory = await this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      await tx.ticketType.update({
        where: { id: ticketTypeId },
        data: {
          totalQuantity,
          reservedQuantity,
          soldQuantity,
        },
      });

      return tx.ticketInventory.upsert({
        where: { ticketTypeId },
        create: {
          ticketTypeId,
          totalQuantity,
          availableQuantity: totalQuantity - reservedQuantity - soldQuantity,
          reservedQuantity,
          soldQuantity,
        },
        update: {
          totalQuantity,
          availableQuantity: totalQuantity - reservedQuantity - soldQuantity,
          reservedQuantity,
          soldQuantity,
        },
      });
    });
    await publishConcertListingInvalidation('ticket-type.updated', {
      concertId: ticketType.concertId,
      ticketTypeId,
    });
    return inventory;
  }

  private validateTicketTypeInput(input: TicketTypeInput, concert: { saleOpenAt: Date; startAt: Date }) {
    if (input.price < 0 || input.totalQuantity < 0 || input.maxPerAccount <= 0) {
      throw new AppError(400, 'TICKET_QUANTITY_INVALID', 'Ticket quantities and price are invalid.');
    }
    this.validateTicketSaleWindow(
      input.saleOpenAt ? new Date(input.saleOpenAt) : null,
      input.saleCloseAt ? new Date(input.saleCloseAt) : null,
      concert
    );
  }

  private validateTicketSaleWindow(
    saleOpenAt: Date | null,
    saleCloseAt: Date | null,
    concert: { saleOpenAt: Date; startAt: Date }
  ) {
    const effectiveOpenAt = saleOpenAt || concert.saleOpenAt;
    const effectiveCloseAt = saleCloseAt || concert.startAt;
    if (!Number.isFinite(effectiveOpenAt.getTime()) || !Number.isFinite(effectiveCloseAt.getTime())) {
      throw new AppError(400, 'SALE_TIME_INVALID', 'Thoi gian ban ve khong hop le.');
    }
    if (effectiveOpenAt < concert.saleOpenAt) {
      throw new AppError(400, 'SALE_TIME_INVALID', 'Loai ve khong duoc mo ban truoc concert.');
    }
    if (effectiveOpenAt >= effectiveCloseAt || effectiveCloseAt > concert.startAt) {
      throw new AppError(400, 'SALE_TIME_INVALID', 'Cua so ban ve phai ket thuc khong sau thoi gian bieu dien.');
    }
  }

  private async assertTicketTypeIdentityAvailable(
    concertId: string,
    name: string,
    zoneCode: string,
    excludeTicketTypeId?: string
  ) {
    const existing = await this.prisma.ticketType.findFirst({
      where: {
        concertId,
        ...(excludeTicketTypeId ? { id: { not: excludeTicketTypeId } } : {}),
        OR: [
          { name: { equals: name.trim(), mode: 'insensitive' } },
          { zoneCode: assertZoneCode(zoneCode) },
        ],
      },
      select: { name: true, zoneCode: true },
    });
    if (existing) {
      throw new AppError(
        409,
        'TICKET_TYPE_IDENTITY_EXISTS',
        `Ten loai ve hoac ma khu vuc da ton tai (${existing.name} / ${existing.zoneCode}).`
      );
    }
  }

  private deriveInventory(ticketType: {
    id: string;
    totalQuantity: number;
    reservedQuantity: number;
    soldQuantity: number;
  }) {
    return {
      ticketTypeId: ticketType.id,
      totalQuantity: ticketType.totalQuantity,
      availableQuantity: ticketType.totalQuantity - ticketType.reservedQuantity - ticketType.soldQuantity,
      reservedQuantity: ticketType.reservedQuantity,
      soldQuantity: ticketType.soldQuantity,
    };
  }
}
