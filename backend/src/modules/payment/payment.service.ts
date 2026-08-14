import { randomUUID } from 'crypto';
import { Injectable, Logger } from '@nestjs/common';
import type { OrderStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../shared/modules/prisma.service';
import { AppError } from '../../shared/lib/errors';
import { publishToQueue } from '../../shared/lib/rabbitmq';
import { invalidateTicketAvailabilityCache } from '../concert/concert-detail-cache';
import { getOrderHoldTtlMs } from '../order/order-expiration';
import { PaymentCacheService } from './payment-cache.service';
import { PaymentCircuitBreakerService } from './payment-circuit-breaker.service';
import type { PaymentGateway, ProcessedPaymentStatus } from './payment.types';
import { sortObject, timingSafeStringEqual, VnpayGatewayService } from './vnpay-gateway.service';

export { sortObject };

const PENDING_ORDER_STATUSES: OrderStatus[] = ['pending', 'PENDING'];

@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly circuitBreaker: PaymentCircuitBreakerService,
    private readonly vnpayGateway: VnpayGatewayService,
    private readonly paymentCache: PaymentCacheService
  ) {}
  /**
   * Backward-compatible facade for scripts/tests that exercise the breaker directly.
   */
  public async checkCircuitBreaker(gateway: string): Promise<void> {
    return this.circuitBreaker.check(gateway);
  }

  public async recordFailure(gateway: string): Promise<void> {
    return this.circuitBreaker.recordFailure(gateway);
  }

  public async recordSuccess(gateway: string): Promise<void> {
    return this.circuitBreaker.recordSuccess(gateway);
  }

  /**
   * Generate real VNPAY payment redirect URL and create Payment record
   */
  public async createPaymentUrl(params: {
    orderId: string;
    gateway: PaymentGateway;
    returnUrl: string;
    ipAddr: string;
    userId: string;
  }) {
    const { orderId, gateway, returnUrl, ipAddr, userId } = params;

    // 1. Check Circuit Breaker before proceeding
    await this.checkCircuitBreaker(gateway);

    if (gateway === 'momo') {
      throw new AppError(400, 'GATEWAY_DISABLED', 'Cổng thanh toán MoMo tạm thời bị vô hiệu hóa. Vui lòng sử dụng VNPAY.');
    }

    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      throw new AppError(404, 'ORDER_NOT_FOUND', 'Không tìm thấy đơn hàng yêu cầu.');
    }

    if (order.userId !== userId) {
      throw new AppError(403, 'FORBIDDEN_RESOURCE', 'Bạn không có quyền thanh toán đơn hàng này.');
    }

    if (!this.isPayableOrder(order.status, order.createdAt)) {
      if (PENDING_ORDER_STATUSES.includes(order.status) && !this.isActiveHold(order.createdAt)) {
        const expiredConcertId = await this.expirePendingOrderHold(order.id);
        if (expiredConcertId) {
          await invalidateTicketAvailabilityCache(expiredConcertId, 'payment.expired-hold');
        }
      }
      throw new AppError(400, 'INVALID_ORDER_STATUS', 'Đơn hàng không ở trạng thái chờ thanh toán.');
    }

    // Simulate VNPAY connection timeout check (Circuit Breaker demo)
    const simulateFailure = process.env.SIMULATE_PAYMENT_GATEWAY_FAILURE === 'true' && Math.random() < 0.05;
    if (simulateFailure) {
      await this.recordFailure(gateway);
      throw new AppError(504, 'GATEWAY_TIMEOUT', `Không thể kết nối đến máy chủ cổng thanh toán ${gateway.toUpperCase()}.`);
    }

    // API call success -> reset breaker
    await this.recordSuccess(gateway);

    // 2. Create the Payment record in Database
    const payment = await this.prisma.payment.create({
      data: {
        orderId: order.id,
        paymentGateway: 'vnpay',
        amount: order.totalAmount,
        status: 'PENDING',
      },
    });

    const paymentUrl = this.vnpayGateway.createPaymentUrl({
      paymentId: payment.id,
      orderId: order.id,
      amount: Number(order.totalAmount),
      returnUrl,
      ipAddr,
    });

    return {
      paymentId: payment.id,
      paymentUrl,
    };
  }

  /**
   * Process webhook transaction result from VNPAY IPN (Webhook)
   */
  public async processVNPAYIpn(query: Record<string, unknown>) {
    let verification;
    try {
      verification = this.vnpayGateway.verifyIpn(query);
    } catch (err) {
      this.logger.error('[VNPAY IPN] Verification error.', err instanceof Error ? err.stack : String(err));
      return { RspCode: '99', Message: 'Config error' };
    }

    if (!verification) {
      this.logger.error('[VNPAY IPN] Signature validation failed.');
      return { RspCode: '97', Message: 'Signature failure' };
    }

    const { paymentId, responseCode, amount: vnpAmountStr, transactionNo } = verification;

    // 2. Fetch payment record
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
    });

    if (!payment) {
      this.logger.error(`[VNPAY IPN] Payment record ${paymentId} not found.`);
      return { RspCode: '01', Message: 'Order not found' };
    }

    // 3. Verify amount (VNPAY amount is multiplied by 100)
    const expectedAmountCent = Math.round(Number(payment.amount) * 100);
    if (Number(vnpAmountStr) !== expectedAmountCent) {
      this.logger.error(`[VNPAY IPN] Amount mismatch: expected ${expectedAmountCent}, got ${vnpAmountStr}`);
      return { RspCode: '04', Message: 'Amount mismatch' };
    }

    // 4. Verify payment is still pending (Idempotency)
    if (payment.status !== 'PENDING') {
      this.logger.log(`[VNPAY IPN] Payment ${paymentId} already confirmed.`);
      return { RspCode: '02', Message: 'Order already confirmed' };
    }

    // 5. Update DB using atomic transaction
    const status = responseCode === '00' ? 'SUCCESS' : 'FAILED';
    await this.processPaymentStatusUpdate(paymentId, status, transactionNo, responseCode);

    return { RspCode: '00', Message: 'Confirm Success' };
  }

  /**
   * Process return result from VNPAY redirection (GET vnpay-return)
   */
  public async processVNPAYReturn(query: Record<string, unknown>) {
    const verification = this.vnpayGateway.verifyReturn(query);

    if (!verification) {
      this.logger.error('[VNPAY Return] Signature validation failed.');
      return { success: false, message: 'Signature failure' };
    }

    const { paymentId, responseCode, transactionNo } = verification;

    // 2. Fetch payment record
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
    });

    if (!payment) {
      return { success: false, message: 'Payment record not found' };
    }

    // 3. Process status update if still pending
    if (payment.status === 'PENDING') {
      const status = responseCode === '00' ? 'SUCCESS' : 'FAILED';
      try {
        await this.processPaymentStatusUpdate(paymentId, status, transactionNo, responseCode);
      } catch (err) {
        this.logger.error('[VNPAY Return] Error processing payment update.', err instanceof Error ? err.stack : String(err));
      }
    }

    // 4. Retrieve latest status
    const updatedPayment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      include: { order: true },
    });

    return {
      success: updatedPayment?.status === 'SUCCESS',
      payment: updatedPayment,
    };
  }

  /**
   * Helper method to atomically update Payment, Order, Tickets, TicketInventory,
   * invalidate Redis caches, and publish notifications to RabbitMQ
   */
  public async processPaymentStatusUpdate(
    paymentId: string,
    status: ProcessedPaymentStatus,
    transactionId?: string,
    responseCode?: string
  ) {
    const result = await this.prisma.$transaction(async (tx) => {
      // 1. Get payment record
      const payment = await tx.payment.findUnique({
        where: { id: paymentId },
      });

      if (!payment) {
        throw new AppError(404, 'PAYMENT_RECORD_NOT_FOUND', 'Không tìm thấy bản ghi thanh toán.');
      }

      if (payment.status !== 'PENDING') {
        return {
          processed: false,
          status: payment.status,
          orderId: payment.orderId,
        };
      }

      // Update payment
      await tx.payment.update({
        where: { id: paymentId },
        data: {
          status,
          transactionId,
          responseCode,
        },
      });

      // 2. Get order record
      const order = await tx.order.findUnique({
        where: { id: payment.orderId },
        include: {
          orderItems: {
            include: {
              ticketType: true,
              tickets: true,
            },
          },
        },
      });

      if (!order) {
        throw new AppError(404, 'ORDER_RECORD_NOT_FOUND', 'Không tìm thấy bản ghi đơn hàng tương ứng.');
      }

      // If already processed order, return early
      if (!PENDING_ORDER_STATUSES.includes(order.status) || !this.isActiveHold(order.createdAt)) {
        await tx.payment.update({
          where: { id: paymentId },
          data: {
            status: 'FAILED',
            transactionId,
            responseCode,
          },
        });

        if (PENDING_ORDER_STATUSES.includes(order.status)) {
          await tx.order.update({
            where: { id: order.id },
            data: { status: 'expired' },
          });
          await tx.ticket.deleteMany({
            where: {
              orderItem: {
                orderId: order.id,
              },
            },
          });
          await this.releaseReservedInventory(tx, order.orderItems);
        }

        return {
          processed: false,
          status: 'FAILED',
          orderId: order.id,
          userId: order.userId,
          concertId: order.concertId,
          tickets: [],
          reason: 'ORDER_NOT_PAYABLE',
        };
      }

      // 3. Handle Order & Ticket updates
      if (status === 'SUCCESS') {
        // Successful payment: transition order to PAID
        await tx.order.update({
          where: { id: order.id },
          data: {
            status: 'paid',
            paidAt: new Date(),
          },
        });

        // Issue tickets after payment succeeds. Hold-order flow does not create QR before payment.
        for (const item of order.orderItems) {
          const existingTickets = item.tickets;

          for (let i = 0; i < existingTickets.length; i++) {
            const ticket = existingTickets[i];
            await tx.ticket.update({
              where: { id: ticket.id },
              data: {
                status: 'valid',
              },
            });
          }

          const missingTicketCount = Math.max(0, item.quantity - existingTickets.length);
          for (let i = 0; i < missingTicketCount; i++) {
            await tx.ticket.create({
              data: {
                orderItemId: item.id,
                userId: order.userId,
                qrCode: `TICKET-${order.id.slice(0, 8)}-${randomUUID()}`,
                status: 'valid',
              },
            });
          }

          const inventory = await tx.ticketInventory.findUnique({
            where: { ticketTypeId: item.ticketTypeId },
            select: { reservedQuantity: true },
          });
          const inventoryReservedToMove = Math.min(inventory?.reservedQuantity ?? 0, item.quantity);
          const inventoryAvailableToConsume = item.quantity - inventoryReservedToMove;
          const inventoryUpdate: Prisma.TicketInventoryUpdateInput = {
            reservedQuantity: { decrement: inventoryReservedToMove },
            soldQuantity: { increment: item.quantity },
          };
          if (inventoryAvailableToConsume > 0) {
            inventoryUpdate.availableQuantity = { decrement: inventoryAvailableToConsume };
          }
          await tx.ticketInventory.update({
            where: { ticketTypeId: item.ticketTypeId },
            data: inventoryUpdate,
          });

          const currentTicketType = await tx.ticketType.findUnique({
            where: { id: item.ticketTypeId },
            select: { reservedQuantity: true },
          });
          const ticketTypeReservedToMove = Math.min(currentTicketType?.reservedQuantity ?? 0, item.quantity);
          await tx.ticketType.update({
            where: { id: item.ticketTypeId },
            data: {
              reservedQuantity: { decrement: ticketTypeReservedToMove },
              soldQuantity: { increment: item.quantity },
            },
          });
        }

        this.logger.log(`[Payment Service] Order ${order.id} marked as PAID. Tickets activated.`);
      } else {
        // Failed payment: transition order to FAILED
        await tx.order.update({
          where: { id: order.id },
          data: { status: 'failed' },
        });

        // Delete tickets to release seats
        await tx.ticket.deleteMany({
          where: {
            orderItem: {
              orderId: order.id,
            },
          },
        });

        await this.releaseReservedInventory(tx, order.orderItems);

        this.logger.log(`[Payment Service] Order ${order.id} marked as FAILED. Reserved seats released.`);
      }

      // 4. Invalidate Redis Cache for each affected ticket type
      const ticketTypeIds = Array.from(new Set(order.orderItems.map((item) => item.ticketTypeId)));
      await this.paymentCache.invalidateTicketInventories(ticketTypeIds);

      // Re-fetch tickets for RabbitMQ messages
      const updatedTickets = await tx.ticket.findMany({
        where: {
          orderItem: {
            orderId: order.id,
          },
        },
      });

      return {
        processed: true,
        status: status === 'SUCCESS' ? 'SUCCESS' : 'FAILED',
        orderId: order.id,
        userId: order.userId,
        concertId: order.concertId,
        tickets: updatedTickets,
      };
    });

    // 5. Publish messages to RabbitMQ after transaction successfully commits
    if (result.concertId) {
      await invalidateTicketAvailabilityCache(result.concertId, `payment.${String(result.status).toLowerCase()}`);
    }

    if (result.processed && result.concertId) {
      if (result.status === 'SUCCESS') {
        for (const ticket of (result.tickets || [])) {
          await publishToQueue('ticketbox_notifications', {
            type: 'purchase_confirm',
            payload: {
              userId: result.userId,
              concertId: result.concertId,
              ticketId: ticket.id,
              orderId: result.orderId,
            },
          });
        }
      } else if (result.status === 'FAILED') {
        await publishToQueue('ticketbox_notifications', {
          type: 'purchase_failed',
          payload: {
            userId: result.userId,
            concertId: result.concertId,
            orderId: result.orderId,
            reason: 'Giao dịch thanh toán không thành công từ cổng thanh toán.',
          },
        });
      }
    }

    return result;
  }

  public async createPayment(params: {
    userId: string;
    orderId: string;
    gateway: string;
    ipAddress: string;
  }) {
    const gateway = this.normalizeGateway(params.gateway);
    const returnUrl = process.env.VNPAY_RETURN_URL || 'http://localhost:3000/api/v1/payments/vnpay-return';
    return this.createPaymentUrl({
      userId: params.userId,
      orderId: params.orderId,
      gateway,
      returnUrl,
      ipAddr: params.ipAddress,
    });
  }

  public async handleVNPAYIpn(query: Record<string, unknown>) {
    const res = await this.processVNPAYIpn(query);
    return { code: res.RspCode, message: res.Message };
  }

  public async handleVNPAYReturn(query: Record<string, unknown>) {
    const result = await this.processVNPAYReturn(query);
    const statusText = result.success ? 'Thanh toán thành công' : 'Thanh toán thất bại';
    return `<!DOCTYPE html><html><head><title>Kết quả thanh toán</title></head><body><h1>${statusText}</h1><p>Mã đơn hàng: ${result.payment?.orderId || ''}</p></body></html>`;
  }

  public async renderMockCheckout(_query: Record<string, unknown>) {
    if (process.env.ENABLE_MOCK_PAYMENT_WEBHOOK !== 'true') {
      throw new AppError(404, 'MOCK_PAYMENT_DISABLED', 'Mock payment checkout is disabled.');
    }
    return `<!DOCTYPE html><html><head><title>Mock Checkout</title></head><body><h1>Mock Payment Gateway</h1></body></html>`;
  }

  public async handleWebhook(body: { paymentId?: string; status?: string }, providedSecret?: string) {
    if (process.env.ENABLE_MOCK_PAYMENT_WEBHOOK !== 'true') {
      throw new AppError(404, 'MOCK_PAYMENT_DISABLED', 'Mock payment webhook is disabled.');
    }

    const expectedSecret = process.env.MOCK_PAYMENT_WEBHOOK_SECRET;
    if (!expectedSecret || expectedSecret.length < 32) {
      throw new AppError(500, 'MOCK_PAYMENT_WEBHOOK_SECRET_MISSING', 'Mock payment webhook secret is not configured.');
    }

    if (!timingSafeStringEqual(providedSecret, expectedSecret)) {
      throw new AppError(401, 'MOCK_PAYMENT_WEBHOOK_UNAUTHORIZED', 'Invalid mock payment webhook secret.');
    }

    const { paymentId, status } = body;
    if (paymentId && (status === 'SUCCESS' || status === 'FAILED')) {
      return this.processPaymentStatusUpdate(paymentId, status);
    }
    return { message: 'Webhook received' };
  }

  private normalizeGateway(gateway: string): PaymentGateway {
    const normalized = String(gateway || '').trim().toLowerCase();
    if (normalized === 'momo') {
      throw new AppError(400, 'GATEWAY_DISABLED', 'Cổng thanh toán MoMo tạm thời bị vô hiệu hóa. Vui lòng sử dụng VNPAY.');
    }
    if (normalized !== 'vnpay') {
      throw new AppError(400, 'PAYMENT_GATEWAY_INVALID', 'Cổng thanh toán không hợp lệ.');
    }
    return 'vnpay';
  }

  private isActiveHold(createdAt: Date): boolean {
    return Date.now() <= createdAt.getTime() + getOrderHoldTtlMs();
  }

  private isPayableOrder(status: OrderStatus, createdAt: Date): boolean {
    return PENDING_ORDER_STATUSES.includes(status) && this.isActiveHold(createdAt);
  }

  private async releaseReservedInventory(
    tx: Prisma.TransactionClient,
    orderItems: Array<{ ticketTypeId: string; quantity: number }>
  ) {
    for (const item of orderItems) {
      const inventory = await tx.ticketInventory.findUnique({
        where: { ticketTypeId: item.ticketTypeId },
        select: { reservedQuantity: true },
      });
      const inventoryReservedToRelease = Math.min(inventory?.reservedQuantity ?? 0, item.quantity);
      await tx.ticketInventory.update({
        where: { ticketTypeId: item.ticketTypeId },
        data: {
          reservedQuantity: { decrement: inventoryReservedToRelease },
          availableQuantity: { increment: inventoryReservedToRelease },
        },
      });

      const currentTicketType = await tx.ticketType.findUnique({
        where: { id: item.ticketTypeId },
        select: { reservedQuantity: true },
      });
      const ticketTypeReservedToRelease = Math.min(currentTicketType?.reservedQuantity ?? 0, item.quantity);
      await tx.ticketType.update({
        where: { id: item.ticketTypeId },
        data: {
          reservedQuantity: { decrement: ticketTypeReservedToRelease },
        },
      });
    }
  }

  private async expirePendingOrderHold(orderId: string) {
    return this.prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({
        where: { id: orderId },
        include: { orderItems: true },
      });

      if (!order || !PENDING_ORDER_STATUSES.includes(order.status) || this.isActiveHold(order.createdAt)) {
        return null;
      }

      await tx.order.update({
        where: { id: order.id },
        data: { status: 'expired' },
      });
      await tx.ticket.deleteMany({
        where: {
          orderItem: {
            orderId: order.id,
          },
        },
      });
      await this.releaseReservedInventory(tx, order.orderItems);
      return order.concertId;
    });
  }
}
