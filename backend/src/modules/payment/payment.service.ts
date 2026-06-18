import { prisma } from '../../shared/lib/prisma';
import redisClient from '../../shared/lib/redis';
import { AppError } from '../../shared/lib/errors';
import { publishToQueue } from '../../shared/lib/rabbitmq';

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

    // 2. Generate a mock redirect URL using the orderId directly (since there is no Payment table)
    const mockRedirectUrl = `http://localhost:3000/api/v1/payments/mock-checkout?paymentId=${orderId}&gateway=${gateway}&amount=${order.totalAmount}`;

    return {
      paymentId: orderId,
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

    const result = await prisma.$transaction(async (tx) => {
      // 1. Get order record (using paymentId as orderId)
      const order = await tx.order.findUnique({
        where: { id: paymentId },
        include: { orderItems: { include: { tickets: true } } },
      });

      if (!order) {
        throw new AppError(404, 'ORDER_RECORD_NOT_FOUND', 'Không tìm thấy bản ghi đơn hàng tương ứng.');
      }

      // If already processed, return early
      if (order.status !== 'PENDING') {
        return {
          processed: false,
          status: order.status,
          orderId: order.id,
          userId: order.userId,
          concertId: order.concertId,
          tickets: [],
        };
      }

      // 2. Handle Order & Ticket updates
      if (status === 'SUCCESS') {
        // Successful payment: transition order to PAID
        await tx.order.update({
          where: { id: order.id },
          data: {
            status: 'PAID',
            paidAt: new Date(),
          },
        });

        await tx.ticket.updateMany({
          where: {
            orderItem: {
              orderId: order.id,
            },
          },
          data: { status: 'valid' },
        });

        console.log(`[Payment Webhook] Order ${order.id} marked as PAID. Tickets activated.`);
      } else {
        // Failed payment: transition order to CANCELLED and delete tickets to release seats
        await tx.order.update({
          where: { id: order.id },
          data: { status: 'CANCELLED' },
        });

        await tx.ticket.deleteMany({
          where: {
            orderItem: {
              orderId: order.id,
            },
          },
        });

        console.log(`[Payment Webhook] Order ${order.id} marked as CANCELLED. Held seats deleted.`);
      }

      // 3. Invalidate Redis Cache for each affected ticket type
      const ticketTypeIds = Array.from(new Set(order.orderItems.map((item) => item.ticketTypeId)));
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
        status: status === 'SUCCESS' ? 'SUCCESS' : 'FAILED',
        orderId: order.id,
        userId: order.userId,
        concertId: order.concertId,
        tickets: status === 'SUCCESS' ? order.orderItems.flatMap((item) => item.tickets) : [],
      };
    });

    // 4. Publish messages to RabbitMQ after transaction successfully commits
    if (result.processed) {
      if (result.status === 'SUCCESS') {
        for (const ticket of result.tickets) {
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
}
