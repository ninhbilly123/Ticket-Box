import { createClient } from 'redis';

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
const DEFAULT_REDIS_OPERATION_TIMEOUT_MS = 500;

const redisClient = createClient({
  url: redisUrl,
  disableOfflineQueue: true,
  socket: {
    connectTimeout: 500,
    reconnectStrategy: (retries) => Math.min(retries * 100, 1000),
  },
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

function getRedisOperationTimeoutMs() {
  const configured = Number(process.env.REDIS_OPERATION_TIMEOUT_MS || DEFAULT_REDIS_OPERATION_TIMEOUT_MS);
  return Number.isFinite(configured) && configured > 0 ? configured : DEFAULT_REDIS_OPERATION_TIMEOUT_MS;
}

export function isRedisReady() {
  return redisClient.isOpen && redisClient.isReady;
}

export async function runRedisOperation<T>(operation: () => Promise<T>, timeoutMs = getRedisOperationTimeoutMs()) {
  if (!isRedisReady()) {
    throw new Error('Redis unavailable');
  }

  let timeoutHandle: NodeJS.Timeout | undefined;
  try {
    return await Promise.race([
      operation(),
      new Promise<T>((_, reject) => {
        timeoutHandle = setTimeout(() => reject(new Error('Redis operation timed out')), timeoutMs);
      }),
    ]);
  } finally {
    if (timeoutHandle) {
      clearTimeout(timeoutHandle);
    }
  }
}

export default redisClient;
