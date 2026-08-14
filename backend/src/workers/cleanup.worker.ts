import { OrderHoldService } from '../modules/order/order-hold.service';
import { invalidateTicketAvailabilityCache } from '../modules/concert/concert-detail-cache';

/**
 * Safety fallback for expired pending orders.
 * RabbitMQ delayed jobs are the primary expiration trigger; this scanner only
 * catches orders whose delayed message was missed while the app was down.
 */
export async function cleanupExpiredOrders(orderHoldService: OrderHoldService) {
  try {
    const results = await orderHoldService.expireOldPendingOrders();
    const expiredResults = results.filter((result) => result.result === 'expired');

    for (const result of expiredResults) {
      await invalidateTicketAvailabilityCache(result.concertId, 'cleanup.expired');
      console.log(`[Cleanup Worker] Expired pending order ${result.orderId}. Inventory returned.`);
    }
  } catch (error) {
    console.error('[Cleanup Worker Error] Error running order cleanup:', error);
  }
}

export function startCleanupWorker(orderHoldService: OrderHoldService) {
  console.log('[Cleanup Worker] Background cleanup worker initialized (safety scan every 60s)...');
  setInterval(() => cleanupExpiredOrders(orderHoldService), 60 * 1000);
}

export default startCleanupWorker;
