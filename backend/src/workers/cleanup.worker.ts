import { prisma } from '../shared/lib/prisma';
import redisClient from '../shared/lib/redis';

/**
 * Cleanup expired PENDING orders (older than 10 minutes)
 * and release their RESERVED ticket holds.
 */
export async function cleanupExpiredOrders() {
  const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);

  try {
    // 1. Fetch expired PENDING orders
    const expiredOrders = await prisma.order.findMany({
      where: {
        status: 'PENDING',
        createdAt: {
          lt: tenMinutesAgo,
        },
      },
      include: {
        orderItems: {
          include: {
            tickets: true,
          },
        },
      },
    });

    if (expiredOrders.length === 0) {
      return;
    }

    console.log(`[Cleanup Worker] Found ${expiredOrders.length} expired orders. Releasing seats...`);

    for (const order of expiredOrders) {
      // 2. Transactionally update order status and remove reserved tickets
      await prisma.$transaction(async (tx) => {
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
      });

      // 3. Invalidate Redis inventory cache for affected ticket types
      const ticketTypeIds = Array.from(new Set(order.orderItems.map((item) => item.ticketTypeId)));
      for (const ttId of ticketTypeIds) {
        const cacheKey = `ticket_inventory:${ttId}`;
        try {
          if (redisClient.isOpen) {
            await redisClient.del(cacheKey);
          }
        } catch (cacheErr) {
          console.error(`[Cleanup Worker Error] Failed to delete cache key ${cacheKey}:`, cacheErr);
        }
      }

      console.log(`[Cleanup Worker] Order ${order.id} cancelled due to timeout. Seats released.`);
    }
  } catch (err) {
    console.error('[Cleanup Worker Error] Error running order cleanup:', err);
  }
}

/**
 * Start worker loop on server startup
 */
export function startCleanupWorker() {
  console.log('[Cleanup Worker] Background cleanup worker initialized (running every 60s)...');
  // Run every 60 seconds
  setInterval(cleanupExpiredOrders, 60 * 1000);
}
export default startCleanupWorker;
