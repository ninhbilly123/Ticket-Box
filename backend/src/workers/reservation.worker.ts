import { Queue, Worker, Job } from 'bullmq';
import { prisma } from '../shared/lib/prisma';
import redisClient from '../shared/lib/redis';

// Create a connection object based on REDIS_URL
let host = 'localhost';
let port = 6379;
if (process.env.REDIS_URL) {
  const url = new URL(process.env.REDIS_URL);
  host = url.hostname;
  port = parseInt(url.port || '6379', 10);
}

const connection = {
  host,
  port,
};

// Queue instance for producing delayed jobs
export const reservationQueue = new Queue('reservationQueue', { connection });

// Worker instance for consuming delayed jobs
export const reservationWorker = new Worker(
  'reservationQueue',
  async (job: Job) => {
    const { orderId } = job.data;
    console.log(`[ReservationWorker] Checking expiration for order ${orderId}`);

    try {
      const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: { tickets: true }
      });

      if (!order) return;

      // If order is still PENDING after 10 minutes, we cancel it and release tickets
      if (order.status === 'PENDING') {
        console.log(`[ReservationWorker] Order ${orderId} is still PENDING after timeout. Releasing seats...`);

        await prisma.$transaction(async (tx) => {
          await tx.order.update({
            where: { id: order.id },
            data: { status: 'CANCELLED' },
          });

          await tx.ticket.updateMany({
            where: {
              orderId: order.id,
              status: 'RESERVED',
            },
            data: {
              status: 'AVAILABLE',
              orderId: null
            }
          });
        });

        // Delete Redis lock explicitly just in case TTL hasn't fired or for explicit cleanup
        for (const ticket of order.tickets) {
          const lockKey = `ticket:${ticket.id}:lock`;
          try {
            if (redisClient.isOpen) {
              await redisClient.del(lockKey);
            }
          } catch (e) {
            console.error(`[ReservationWorker] Failed to delete lock key ${lockKey}:`, e);
          }
        }

        // Invalidate Redis inventory cache for affected ticket types
        const ticketTypeIds = Array.from(new Set(order.tickets.map((t) => t.ticketTypeId)));
        for (const ttId of ticketTypeIds) {
          const cacheKey = `ticket_inventory:${ttId}`;
          try {
            if (redisClient.isOpen) {
              await redisClient.del(cacheKey);
            }
          } catch (e) {
            console.error(`[ReservationWorker] Failed to clear inventory cache ${cacheKey}:`, e);
          }
        }

        console.log(`[ReservationWorker] Order ${orderId} successfully cancelled.`);
      }
    } catch (error) {
      console.error(`[ReservationWorker] Error processing order ${orderId}:`, error);
      throw error;
    }
  },
  { connection }
);

reservationWorker.on('failed', (job, err) => {
  console.error(`[ReservationWorker] Job ${job?.id} failed:`, err);
});
