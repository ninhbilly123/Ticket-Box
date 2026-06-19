import * as crypto from 'crypto';
import { prisma } from '../../shared/lib/prisma';
import redisClient from '../../shared/lib/redis';
import { AppError } from '../../shared/lib/errors';
import { publishToQueue } from '../../shared/lib/rabbitmq';

// Helper function to generate VNPAY time format (yyyyMMddHHmmss) in GMT+7
function getVNPTime(): string {
  const date = new Date();
  // Vietnam timezone is GMT+7
  const tzOffset = 7 * 60; // offset in minutes
  const vnTime = new Date(date.getTime() + tzOffset * 60 * 1000 + date.getTimezoneOffset() * 60 * 1000);
  
  const pad = (num: number) => String(num).padStart(2, '0');
  
  const year = vnTime.getFullYear();
  const month = pad(vnTime.getMonth() + 1);
  const day = pad(vnTime.getDate());
  const hour = pad(vnTime.getHours());
  const minute = pad(vnTime.getMinutes());
  const second = pad(vnTime.getSeconds());
  
  return `${year}${month}${day}${hour}${minute}${second}`;
}

// Helper function to sort object parameters alphabetically by key (needed for VNPAY hashing)
export function sortObject(obj: any) {
  const sorted: any = {};
  const str = [];
  let key;
  for (key in obj) {
    if (obj.hasOwnProperty(key)) {
      str.push(encodeURIComponent(key));
    }
  }
  str.sort();
  for (key = 0; key < str.length; key++) {
    sorted[str[key]] = encodeURIComponent(obj[str[key]]).replace(/%20/g, "+");
  }
  return sorted;
}

// Helper to stringify parameters into key=value joined by &
function stringifyParams(obj: any): string {
  return Object.entries(obj)
    .map(([key, val]) => `${key}=${val}`)
    .join('&');
}

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
   * Generate real VNPAY payment redirect URL and create Payment record
   */
  public async createPaymentUrl(params: {
    orderId: string;
    gateway: 'vnpay' | 'momo';
    returnUrl: string;
    ipAddr: string;
  }) {
    const { orderId, gateway, returnUrl, ipAddr } = params;

    // 1. Check Circuit Breaker before proceeding
    await this.checkCircuitBreaker(gateway);

    if (gateway === 'momo') {
      throw new AppError(400, 'GATEWAY_DISABLED', 'Cổng thanh toán MoMo tạm thời bị vô hiệu hóa. Vui lòng sử dụng VNPAY.');
    }

    const order = await prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      throw new AppError(404, 'ORDER_NOT_FOUND', 'Không tìm thấy đơn hàng yêu cầu.');
    }

    if (!['pending', 'PENDING'].includes(order.status)) {
      throw new AppError(400, 'INVALID_ORDER_STATUS', 'Đơn hàng không ở trạng thái chờ thanh toán.');
    }

    // Simulate VNPAY connection timeout check (Circuit Breaker demo)
    const simulateFailure = Math.random() < 0.05; // 5% failure simulation rate
    if (simulateFailure) {
      await this.recordFailure(gateway);
      throw new AppError(504, 'GATEWAY_TIMEOUT', `Không thể kết nối đến máy chủ cổng thanh toán ${gateway.toUpperCase()}.`);
    }

    // API call success -> reset breaker
    await this.recordSuccess(gateway);

    // 2. Create the Payment record in Database
    const payment = await prisma.payment.create({
      data: {
        orderId: order.id,
        paymentGateway: 'vnpay',
        amount: order.totalAmount,
        status: 'PENDING',
      },
    });

    // 3. Generate VNPAY sandbox payment URL
    const tmnCode = process.env.VNPAY_TMN_CODE;
    const secretKey = process.env.VNPAY_HASH_SECRET;
    const vnpUrl = process.env.VNPAY_URL || 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html';

    if (!tmnCode || !secretKey) {
      throw new AppError(500, 'CONFIG_ERROR', 'Chưa cấu hình VNPAY_TMN_CODE hoặc VNPAY_HASH_SECRET trong file .env');
    }

    const vnpParams: Record<string, string> = {
      vnp_Version: '2.1.0',
      vnp_Command: 'pay',
      vnp_TmnCode: tmnCode,
      vnp_Locale: 'vn',
      vnp_CurrCode: 'VND',
      vnp_TxnRef: payment.id,
      vnp_OrderInfo: `Thanh toan don hang ${order.id}`,
      vnp_OrderType: 'other',
      vnp_Amount: String(Math.round(Number(order.totalAmount) * 100)),
      vnp_ReturnUrl: returnUrl,
      vnp_IpAddr: ipAddr,
      vnp_CreateDate: getVNPTime(),
    };

    const sortedParams = sortObject(vnpParams);
    const signData = stringifyParams(sortedParams);
    const hmac = crypto.createHmac('sha512', secretKey);
    const signed = hmac.update(Buffer.from(signData, 'utf-8')).digest('hex');
    sortedParams['vnp_SecureHash'] = signed;

    const paymentUrl = `${vnpUrl}?${stringifyParams(sortedParams)}`;

    return {
      paymentId: payment.id,
      paymentUrl,
    };
  }

  /**
   * Process webhook transaction result from VNPAY IPN (Webhook)
   */
  public async processVNPAYIpn(query: any) {
    const secureHash = query.vnp_SecureHash;

    const secretKey = process.env.VNPAY_HASH_SECRET;
    if (!secretKey) {
      return { RspCode: '99', Message: 'Config error' };
    }

    // 1. Verify VNPAY Signature
    const vnpParams: Record<string, string> = {};
    for (const key of Object.keys(query)) {
      if (key !== 'vnp_SecureHash' && key !== 'vnp_SecureHashType') {
        vnpParams[key] = String(query[key]);
      }
    }

    const sortedParams = sortObject(vnpParams);
    const signData = stringifyParams(sortedParams);
    const hmac = crypto.createHmac('sha512', secretKey);
    const signed = hmac.update(Buffer.from(signData, 'utf-8')).digest('hex');

    if (secureHash !== signed) {
      console.error('[VNPAY IPN] Signature validation failed.');
      return { RspCode: '97', Message: 'Signature failure' };
    }

    const paymentId = vnpParams['vnp_TxnRef'];
    const responseCode = vnpParams['vnp_ResponseCode'];
    const vnpAmountStr = vnpParams['vnp_Amount'];
    const transactionNo = vnpParams['vnp_TransactionNo'];

    // 2. Fetch payment record
    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
    });

    if (!payment) {
      console.error(`[VNPAY IPN] Payment record ${paymentId} not found.`);
      return { RspCode: '01', Message: 'Order not found' };
    }

    // 3. Verify amount (VNPAY amount is multiplied by 100)
    const expectedAmountCent = Math.round(Number(payment.amount) * 100);
    if (Number(vnpAmountStr) !== expectedAmountCent) {
      console.error(`[VNPAY IPN] Amount mismatch: expected ${expectedAmountCent}, got ${vnpAmountStr}`);
      return { RspCode: '04', Message: 'Amount mismatch' };
    }

    // 4. Verify payment is still pending (Idempotency)
    if (payment.status !== 'PENDING') {
      console.log(`[VNPAY IPN] Payment ${paymentId} already confirmed.`);
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
  public async processVNPAYReturn(query: any) {
    const secureHash = query.vnp_SecureHash;

    const secretKey = process.env.VNPAY_HASH_SECRET;
    if (!secretKey) {
      throw new AppError(500, 'CONFIG_ERROR', 'Chưa cấu hình VNPAY_HASH_SECRET trong file .env');
    }

    // 1. Verify VNPAY Signature
    const vnpParams: Record<string, string> = {};
    for (const key of Object.keys(query)) {
      if (key !== 'vnp_SecureHash' && key !== 'vnp_SecureHashType') {
        vnpParams[key] = String(query[key]);
      }
    }

    const sortedParams = sortObject(vnpParams);
    const signData = stringifyParams(sortedParams);
    const hmac = crypto.createHmac('sha512', secretKey);
    const signed = hmac.update(Buffer.from(signData, 'utf-8')).digest('hex');

    if (secureHash !== signed) {
      console.error('[VNPAY Return] Signature validation failed.');
      return { success: false, message: 'Signature failure' };
    }

    const paymentId = vnpParams['vnp_TxnRef'];
    const responseCode = vnpParams['vnp_ResponseCode'];
    const transactionNo = vnpParams['vnp_TransactionNo'];

    // 2. Fetch payment record
    const payment = await prisma.payment.findUnique({
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
        console.error('[VNPAY Return] Error processing payment update:', err);
      }
    }

    // 4. Retrieve latest status
    const updatedPayment = await prisma.payment.findUnique({
      where: { id: paymentId },
      include: { order: true },
    });

    return {
      success: responseCode === '00',
      payment: updatedPayment,
    };
  }

  /**
   * Helper method to atomically update Payment, Order, Tickets, TicketInventory,
   * invalidate Redis caches, and publish notifications to RabbitMQ
   */
  public async processPaymentStatusUpdate(
    paymentId: string,
    status: 'SUCCESS' | 'FAILED',
    transactionId?: string,
    responseCode?: string
  ) {
    const result = await prisma.$transaction(async (tx) => {
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
        include: { orderItems: { include: { tickets: true } } },
      });

      if (!order) {
        throw new AppError(404, 'ORDER_RECORD_NOT_FOUND', 'Không tìm thấy bản ghi đơn hàng tương ứng.');
      }

      // If already processed order, return early
      if (order.status !== 'pending' && order.status !== 'PENDING') {
        return {
          processed: false,
          status: order.status,
          orderId: order.id,
          userId: order.userId,
          concertId: order.concertId,
          tickets: [],
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

        // Activate tickets and generate seat numbers
        const tickets = await tx.ticket.findMany({
          where: {
            orderItem: {
              orderId: order.id,
            },
          },
        });

        for (let i = 0; i < tickets.length; i++) {
          const t = tickets[i];
          const seatNum = t.seatNumber || `S-${Math.floor(10 + Math.random() * 89)}-${i + 1}`;
          await tx.ticket.update({
            where: { id: t.id },
            data: {
              status: 'valid',
              seatNumber: seatNum,
            },
          });
        }

        // Update TicketInventory (reserved -> sold)
        for (const item of order.orderItems) {
          await tx.ticketInventory.update({
            where: { ticketTypeId: item.ticketTypeId },
            data: {
              reservedQuantity: { decrement: item.quantity },
              soldQuantity: { increment: item.quantity },
            },
          });
        }

        console.log(`[Payment Service] Order ${order.id} marked as PAID. Tickets activated.`);
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

        // Update TicketInventory (release reserved)
        for (const item of order.orderItems) {
          await tx.ticketInventory.update({
            where: { ticketTypeId: item.ticketTypeId },
            data: {
              reservedQuantity: { decrement: item.quantity },
              availableQuantity: { increment: item.quantity },
            },
          });
        }

        console.log(`[Payment Service] Order ${order.id} marked as FAILED. Reserved seats released.`);
      }

      // 4. Invalidate Redis Cache for each affected ticket type
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
    if (result.processed) {
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
}
