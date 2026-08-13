import { Logger } from '@nestjs/common';
import { connectRabbitMQ } from '../../shared/lib/rabbitmq';

export const CONCERT_LISTING_EXCHANGE = process.env.RABBITMQ_EXCHANGE || 'ticketbox.events';
export const CONCERT_LISTING_INVALIDATION_QUEUE =
  process.env.CONCERT_LIST_CACHE_INVALIDATION_QUEUE || 'concert-listing-cache-invalidation';

export const CONCERT_LISTING_INVALIDATION_ROUTING_KEYS = [
  'concert.created',
  'concert.updated',
  'concert.published',
  'concert.cancelled',
  'ticket-type.updated',
] as const;
const logger = new Logger('ConcertListingEvents');

export type ConcertListingInvalidationEventType = (typeof CONCERT_LISTING_INVALIDATION_ROUTING_KEYS)[number];

export interface ConcertListingInvalidationMessage {
  eventType: ConcertListingInvalidationEventType;
  concertId?: string;
  ticketTypeId?: string;
  occurredAt: string;
}

export async function publishConcertListingInvalidation(
  eventType: ConcertListingInvalidationEventType,
  payload: { concertId?: string; ticketTypeId?: string } = {}
) {
  const message: ConcertListingInvalidationMessage = {
    eventType,
    ...payload,
    occurredAt: new Date().toISOString(),
  };

  try {
    const { channel } = await connectRabbitMQ();
    await channel.assertExchange(CONCERT_LISTING_EXCHANGE, 'topic', { durable: true });
    const published = channel.publish(
      CONCERT_LISTING_EXCHANGE,
      eventType,
      Buffer.from(JSON.stringify(message)),
      { persistent: true }
    );
    if (!published) {
      logger.warn(`[RabbitMQ] Concert listing invalidation publish buffered: ${eventType}`);
    }
    return published;
  } catch (error) {
    logger.warn(`[RabbitMQ] Concert listing invalidation publish failed: ${eventType}`, error instanceof Error ? error.stack : String(error));
    return false;
  }
}
