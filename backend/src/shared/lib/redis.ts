import { createClient } from 'redis';

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

const redisClient = createClient({
  url: redisUrl,
});

redisClient.on('error', (err) => console.error('Redis Client Error', err));
redisClient.on('connect', () => console.log('Redis Client Connected'));

// Proactively connect to Redis
(async () => {
  try {
    if (!redisClient.isOpen) {
      await redisClient.connect();
    }
  } catch (err) {
    console.error('Failed to connect to Redis:', err);
  }
})();

export const lockTicket = async (ticketId: string, orderId: string, expiresInSeconds: number = 600) => {
  const lockKey = `ticket:${ticketId}:lock`;
  // SET key value EX seconds NX (only if it does not exist)
  const result = await redisClient.set(lockKey, orderId, {
    EX: expiresInSeconds,
    NX: true
  });
  return result === 'OK';
};

export const unlockTicket = async (ticketId: string) => {
  const lockKey = `ticket:${ticketId}:lock`;
  await redisClient.del(lockKey);
};

export const getLockedTickets = async (ticketIds: string[]) => {
  // Check multiple tickets using mGet or pipeline
  if (ticketIds.length === 0) return [];
  const keys = ticketIds.map(id => `ticket:${id}:lock`);
  const results = await redisClient.mGet(keys);
  
  // Return the ticketIds that are locked (result is not null)
  return ticketIds.filter((_, index) => results[index] !== null);
};

export default redisClient;
