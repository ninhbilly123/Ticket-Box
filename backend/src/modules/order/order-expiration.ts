import { Logger } from '@nestjs/common';
import { connectRabbitMQ } from '../../shared/lib/rabbitmq';

export const DEFAULT_ORDER_HOLD_TTL_SECONDS = 600;
export const ORDER_EXPIRE_DELAY_QUEUE = process.env.ORDER_EXPIRE_DELAY_QUEUE || 'orders.expire.delay.queue';
export const ORDER_EXPIRE_QUEUE = process.env.ORDER_EXPIRE_QUEUE || 'orders.expire.queue';
export const ORDER_EXPIRE_DLX = process.env.ORDER_EXPIRE_DLX || 'orders.expire.dlx';
export const ORDER_EXPIRE_ROUTING_KEY = process.env.ORDER_EXPIRE_ROUTING_KEY || 'orders.expire';
const logger = new Logger('OrderExpiration');

export interface OrderExpirationMessage {
  type: 'EXPIRE_ORDER';
  orderId: string;
  delayMs: number;
}

export function getOrderHoldTtlSeconds() {
  const configured = Number(process.env.ORDER_HOLD_TTL_SECONDS || DEFAULT_ORDER_HOLD_TTL_SECONDS);
  return Number.isFinite(configured) && configured > 0 ? Math.floor(configured) : DEFAULT_ORDER_HOLD_TTL_SECONDS;
}

export function getOrderHoldTtlMs() {
  return getOrderHoldTtlSeconds() * 1000;
}

export async function assertOrderExpirationTopology() {
  const { channel } = await connectRabbitMQ();
  await channel.assertExchange(ORDER_EXPIRE_DLX, 'direct', { durable: true });
  await channel.assertQueue(ORDER_EXPIRE_QUEUE, { durable: true });
  await channel.bindQueue(ORDER_EXPIRE_QUEUE, ORDER_EXPIRE_DLX, ORDER_EXPIRE_ROUTING_KEY);
  await channel.assertQueue(ORDER_EXPIRE_DELAY_QUEUE, {
    durable: true,
    arguments: {
      'x-dead-letter-exchange': ORDER_EXPIRE_DLX,
      'x-dead-letter-routing-key': ORDER_EXPIRE_ROUTING_KEY,
    },
  });
  return channel;
}

export async function publishOrderExpirationJob(orderId: string, delayMs = getOrderHoldTtlMs()) {
  const message: OrderExpirationMessage = {
    type: 'EXPIRE_ORDER',
    orderId,
    delayMs,
  };

  try {
    const channel = await assertOrderExpirationTopology();
    return channel.sendToQueue(ORDER_EXPIRE_DELAY_QUEUE, Buffer.from(JSON.stringify(message)), {
      persistent: true,
      expiration: String(Math.max(0, delayMs)),
    });
  } catch (error) {
    logger.warn(`[Order Expiration] Failed to publish expire job for order ${orderId}`, error instanceof Error ? error.stack : String(error));
    return false;
  }
}
