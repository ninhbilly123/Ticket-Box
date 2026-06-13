import { prisma } from '../../shared/lib/prisma';
import redisClient from '../../shared/lib/redis';
import { AppError } from '../../shared/lib/errors';

export class PaymentService {
  /**
   * Helper to check Circuit Breaker state on Redis
   */
  public async checkCircuitBreaker(gateway: string): Promise<void> {
    if (!redisClient.isOpen) return; // Pass through if Redis is unavailable

    const stateKey = `circuit_breaker:${gateway}:state`;
    const state = await redisClient.get(stateKey);

    if (state === 'OPEN') {
      throw new AppError(
        503,
        'PAYMENT_GATEWAY_MAINTENANCE',
        `Cổng thanh toán ${gateway.toUpperCase()} hiện đang gặp sự cố và đang trong quá trình bảo trì. Vui lòng chọn cổng thanh toán khác hoặc thử lại sau.`
      );
    }
  }

  /**
   * Helper to record API call failure (tripping the Circuit Breaker)
   */
  public async recordFailure(gateway: string): Promise<void> {
    if (!redisClient.isOpen) return;

    const failureKey = `circuit_breaker:${gateway}:failures`;
    const stateKey = `circuit_breaker:${gateway}:state`;

    // Increment failure counter
    const failures = await redisClient.incr(failureKey);
    // Set expiry for failure count if not already set (e.g. 5 minutes window)
    await redisClient.expire(failureKey, 300);

    console.log(`[Circuit Breaker] Gateway ${gateway} failure count: ${failures}/5`);

    if (failures >= 5) {
      console.warn(`[Circuit Breaker] Tripping breaker for gateway ${gateway}! State set to OPEN.`);
      // Set state to OPEN with 60 seconds TTL (cool-down period)
      await redisClient.setEx(stateKey, 60, 'OPEN');
      // Reset failures
      await redisClient.del(failureKey);
    }
  }

  /**
   * Helper to record API call success (closing/resetting the Circuit Breaker)
   */
  public async recordSuccess(gateway: string): Promise<void> {
    if (!redisClient.isOpen) return;

    const failureKey = `circuit_breaker:${gateway}:failures`;
    const stateKey = `circuit_breaker:${gateway}:state`;

    await redisClient.del(failureKey);
    await redisClient.del(stateKey);
    console.log(`[Circuit Breaker] Gateway ${gateway} status reset to CLOSED (Healthy).`);
  }

  /**
   * Generate mock payment checkout URL and create Payment record
   */
  public async createPaymentUrl(params: { orderId: string; gateway: 'vnpay' | 'momo' }) {
    const { orderId, gateway } = params;

    // 1. Check Circuit Breaker before proceeding
    await this.checkCircuitBreaker(gateway);

    const order = await prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      throw new AppError(404, 'ORDER_NOT_FOUND', 'Không tìm thấy đơn hàng yêu cầu.');
    }

    if (order.status !== 'PENDING') {
      throw new AppError(400, 'INVALID_ORDER_STATUS', 'Đơn hàng không ở trạng thái chờ thanh toán.');
    }

    // Simulate API call to the gateway
    // We mock a 10% chance of connection timeout to VNPAY/MoMo APIs to demonstrate the Circuit Breaker!
    const simulateFailure = Math.random() < 0.15;
    if (simulateFailure) {
      await this.recordFailure(gateway);
      throw new AppError(504, 'GATEWAY_TIMEOUT', `Không thể kết nối đến máy chủ cổng thanh toán ${gateway.toUpperCase()}.`);
    }

    // API call success -> reset breaker
    await this.recordSuccess(gateway);

    // 2. Create the PENDING payment record
    const payment = await prisma.payment.create({
      data: {
        orderId,
        paymentGateway: gateway.toUpperCase(),
        amount: order.totalAmount,
        status: 'PENDING',
      },
    });

    // 3. Generate a mock redirect URL that allows testing successful/failed webhook notifications
    const mockRedirectUrl = `http://localhost:3000/api/v1/payments/mock-checkout?paymentId=${payment.id}&gateway=${gateway}&amount=${payment.amount}`;

    return {
      paymentId: payment.id,
      paymentUrl: mockRedirectUrl,
    };
  }

  /**
   * Process webhook transaction results from MoMo/VNPAY
   */
  public async processPaymentWebhook(params: {
    paymentId: string;
    status: 'SUCCESS' | 'FAILED';
    transactionId?: string;
    responseCode?: string;
  }) {
    const { paymentId, status, transactionId, responseCode } = params;

    return await prisma.$transaction(async (tx) => {
      // 1. Get payment record
      const payment = await tx.payment.findUnique({
        where: { id: paymentId },
        include: { order: { include: { tickets: true } } },
      });

      if (!payment) {
        throw new AppError(404, 'PAYMENT_RECORD_NOT_FOUND', 'Không tìm thấy bản ghi giao dịch thanh toán.');
      }

      // If already processed, return early
      if (payment.status !== 'PENDING') {
        return {
          processed: false,
          status: payment.status,
          orderId: payment.orderId,
        };
      }

      // 2. Update payment status
      const updatedPayment = await tx.payment.update({
        where: { id: paymentId },
        data: {
          status: status === 'SUCCESS' ? 'SUCCESS' : 'FAILED',
          transactionId: transactionId || `TX-${Math.floor(100000 + Math.random() * 900000)}`,
          responseCode: responseCode || (status === 'SUCCESS' ? '00' : '99'),
        },
      });

      // 3. Handle Order & Ticket updates
      if (status === 'SUCCESS') {
        // Successful payment: transition order to PAID and tickets to BOOKED
        await tx.order.update({
          where: { id: payment.orderId },
          data: { status: 'PAID' },
        });

        await tx.ticket.updateMany({
          where: { orderId: payment.orderId },
          data: { status: 'BOOKED' },
        });

        console.log(`[Payment Webhook] Order ${payment.orderId} marked as PAID. Tickets created.`);
      } else {
        // Failed payment: transition order to CANCELLED and delete hold tickets to release seats
        await tx.order.update({
          where: { id: payment.orderId },
          data: { status: 'CANCELLED' },
        });

        await tx.ticket.deleteMany({
          where: {
            orderId: payment.orderId,
            status: 'RESERVED',
          },
        });

        console.log(`[Payment Webhook] Order ${payment.orderId} marked as CANCELLED. Held seats deleted.`);
      }

      // 4. Invalidate Redis Cache for each affected ticket type
      const ticketTypeIds = Array.from(new Set(payment.order.tickets.map((t) => t.ticketTypeId)));
      for (const ttId of ticketTypeIds) {
        const cacheKey = `ticket_inventory:${ttId}`;
        try {
          if (redisClient.isOpen) {
            await redisClient.del(cacheKey);
          }
        } catch (err) {
          console.error(`[Redis Invalidation Error] Failed to delete key ${cacheKey}:`, err);
        }
      }

      return {
        processed: true,
        status: updatedPayment.status,
        orderId: payment.orderId,
      };
    });
  }
}
