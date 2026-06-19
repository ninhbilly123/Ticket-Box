import { ConsumeMessage } from 'amqplib';
import { connectRabbitMQ } from '../shared/lib/rabbitmq';
import {
  CONCERT_LISTING_EXCHANGE,
  CONCERT_LISTING_INVALIDATION_QUEUE,
  CONCERT_LISTING_INVALIDATION_ROUTING_KEYS,
} from '../modules/concert/concert-listing-events';
import { invalidateConcertListCache } from '../modules/concert/concert-listing-cache';
import { invalidateConcertDetailCache } from '../modules/concert/concert-detail-cache';

export async function startConcertListingCacheInvalidationWorker() {
  try {
    const { channel } = await connectRabbitMQ();
    await channel.assertExchange(CONCERT_LISTING_EXCHANGE, 'topic', { durable: true });
    await channel.assertQueue(CONCERT_LISTING_INVALIDATION_QUEUE, { durable: true });

    for (const routingKey of CONCERT_LISTING_INVALIDATION_ROUTING_KEYS) {
      await channel.bindQueue(CONCERT_LISTING_INVALIDATION_QUEUE, CONCERT_LISTING_EXCHANGE, routingKey);
    }

    await channel.consume(CONCERT_LISTING_INVALIDATION_QUEUE, async (message: ConsumeMessage | null) => {
      if (!message) return;

      try {
        const raw = message.content.toString();
        const parsed = JSON.parse(raw) as { eventType?: string; concertId?: string };
        const reason = parsed.eventType || message.fields.routingKey;
        await invalidateConcertListCache(reason);
        await invalidateConcertDetailCache(parsed.concertId, reason);
        channel.ack(message);
      } catch (error) {
        console.warn('[Concert Listing Cache Worker] Failed to process invalidation message', error);
        channel.ack(message);
      }
    });

    console.log(
      `[Concert Listing Cache Worker] Listening on ${CONCERT_LISTING_EXCHANGE}/${CONCERT_LISTING_INVALIDATION_QUEUE}`
    );
  } catch (error) {
    console.warn('[Concert Listing Cache Worker] RabbitMQ unavailable; cache invalidation worker not started.', error);
  }
}
