import crypto from 'crypto';
import { Logger } from '@nestjs/common';
import redisClient, { isRedisReady, runRedisOperation } from '../../shared/lib/redis';

export interface ConcertListFilters {
  search?: string;
  artist?: string;
  date?: string;
  location?: string;
}

const DEFAULT_CACHE_TTL_SECONDS = 60;
export const CONCERT_LIST_CACHE_KEYS_SET = 'concert:list:keys';
const logger = new Logger('ConcertListingCache');

function getCacheTtlSeconds() {
  const configured = Number(process.env.CONCERT_LIST_CACHE_TTL || DEFAULT_CACHE_TTL_SECONDS);
  return Number.isFinite(configured) && configured > 0 ? configured : DEFAULT_CACHE_TTL_SECONDS;
}

export function normalizeConcertListFilters(filters: ConcertListFilters) {
  return {
    search: (filters.search || '').trim(),
    artist: (filters.artist || '').trim(),
    date: (filters.date || '').trim(),
    location: (filters.location || '').trim(),
  };
}

export function buildConcertListCacheKey(filters: ConcertListFilters) {
  const normalized = normalizeConcertListFilters(filters);
  const hash = crypto.createHash('sha256').update(JSON.stringify(normalized)).digest('hex').slice(0, 24);
  return `concert:list:${hash}`;
}

export async function readConcertListCache<T>(filters: ConcertListFilters): Promise<T | null> {
  const cacheKey = buildConcertListCacheKey(filters);

  try {
    if (!isRedisReady()) {
      logger.warn('[CACHE SKIP] Redis unavailable');
      return null;
    }

    const cached = await runRedisOperation(() => redisClient.get(cacheKey));
    if (!cached) {
      logger.log(`[CACHE MISS] ${cacheKey}`);
      return null;
    }

    logger.log(`[CACHE HIT] ${cacheKey}`);
    return JSON.parse(cached) as T;
  } catch (error) {
    logger.warn('[CACHE SKIP] Redis unavailable', error instanceof Error ? error.stack : String(error));
    return null;
  }
}

export async function writeConcertListCache(filters: ConcertListFilters, value: unknown) {
  const cacheKey = buildConcertListCacheKey(filters);

  try {
    if (!isRedisReady()) {
      logger.warn('[CACHE SKIP] Redis unavailable');
      return;
    }

    await runRedisOperation(() =>
      redisClient
        .multi()
        .sAdd(CONCERT_LIST_CACHE_KEYS_SET, cacheKey)
        .setEx(cacheKey, getCacheTtlSeconds(), JSON.stringify(value))
        .exec()
    );
  } catch (error) {
    logger.warn('[CACHE SKIP] Redis unavailable', error instanceof Error ? error.stack : String(error));
  }
}

export async function invalidateConcertListCache(reason = 'manual') {
  try {
    if (!isRedisReady()) {
      logger.warn('[CACHE SKIP] Redis unavailable');
      return 0;
    }

    const keys = await runRedisOperation(() => redisClient.sMembers(CONCERT_LIST_CACHE_KEYS_SET));
    if (keys.length > 0) {
      await runRedisOperation(() => redisClient.del(keys));
    }
    await runRedisOperation(() => redisClient.del(CONCERT_LIST_CACHE_KEYS_SET));
    logger.log(`[CACHE INVALIDATED] concert:list (${keys.length} keys, reason=${reason})`);
    return keys.length;
  } catch (error) {
    logger.warn('[CACHE SKIP] Redis unavailable', error instanceof Error ? error.stack : String(error));
    return 0;
  }
}
