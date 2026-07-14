import { ConsumeMessage } from 'amqplib';
import { assertOrderExpirationTopology, ORDER_EXPIRE_QUEUE, publishOrderExpirationJob } from '../modules/order/order-expiration';
import { orderHoldService } from '../modules/order/order-hold.service';
import { invalidateTicketAvailabilityCache } from '../modules/concert/concert-detail-cache';

export async function startOrderExpirationWorker() {
  try {
    const channel = await assertOrderExpirationTopology();
    await channel.prefetch(1);

    await channel.consume(ORDER_EXPIRE_QUEUE, async (message: ConsumeMessage | null) => {
      if (!message) return;

      let orderId: string | undefined;
      try {
        const parsed = JSON.parse(message.content.toString()) as { type?: string; orderId?: string };
        if (parsed.type !== 'EXPIRE_ORDER' || !parsed.orderId) {
          console.warn('[Order Expiration Worker] Ignoring invalid message', parsed);
          channel.ack(message);
          return;
        }

        orderId = parsed.orderId;
        const result = await orderHoldService.expireOrderIfDue(orderId);
        if (result.result === 'not_due') {
          await publishOrderExpirationJob(result.orderId, result.remainingMs);
        }

        if (result.result === 'expired') {
          await invalidateTicketAvailabilityCache(result.concertId, 'order.expired');
        }

        console.log(`[Order Expiration Worker] Processed order ${orderId}: ${result.result}`);
        channel.ack(message);
      } catch (error: any) {
        if (error?.errorCode === 'ORDER_NOT_FOUND') {
          console.warn(`[Order Expiration Worker] Order ${orderId || 'unknown'} not found (might have been deleted during tests). Acknowledging message.`);
          channel.ack(message);
        } else {
          console.error('[Order Expiration Worker] Failed to process message', error);
          channel.nack(message, false, false);
        }
      }
    });

    console.log(`[Order Expiration Worker] Worker started, listening to queue [${ORDER_EXPIRE_QUEUE}]...`);
  } catch (error) {
    console.error('[Order Expiration Worker] Failed to start listener:', error);
    setTimeout(startOrderExpirationWorker, 5000);
  }
}

export default startOrderExpirationWorker;
