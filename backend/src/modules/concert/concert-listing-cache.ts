import crypto from 'crypto';
import redisClient, { isRedisReady, runRedisOperation } from '../../shared/lib/redis';

export interface ConcertListFilters {
  search?: string;
  artist?: string;
  date?: string;
  location?: string;
}

const DEFAULT_CACHE_TTL_SECONDS = 60;
export const CONCERT_LIST_CACHE_KEYS_SET = 'concert:list:keys';

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
      console.warn('[CACHE SKIP] Redis unavailable');
      return null;
    }

    const cached = await runRedisOperation(() => redisClient.get(cacheKey));
    if (!cached) {
      console.log(`[CACHE MISS] ${cacheKey}`);
      return null;
    }

    console.log(`[CACHE HIT] ${cacheKey}`);
    return JSON.parse(cached) as T;
  } catch (error) {
    console.warn('[CACHE SKIP] Redis unavailable', error);
    return null;
  }
}

export async function writeConcertListCache(filters: ConcertListFilters, value: unknown) {
  const cacheKey = buildConcertListCacheKey(filters);

  try {
    if (!isRedisReady()) {
      console.warn('[CACHE SKIP] Redis unavailable');
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
    console.warn('[CACHE SKIP] Redis unavailable', error);
  }
}

export async function invalidateConcertListCache(reason = 'manual') {
  try {
    if (!isRedisReady()) {
      console.warn('[CACHE SKIP] Redis unavailable');
      return 0;
    }

    const keys = await runRedisOperation(() => redisClient.sMembers(CONCERT_LIST_CACHE_KEYS_SET));
    if (keys.length > 0) {
      await runRedisOperation(() => redisClient.del(keys));
    }
    await runRedisOperation(() => redisClient.del(CONCERT_LIST_CACHE_KEYS_SET));
    console.log(`[CACHE INVALIDATED] concert:list (${keys.length} keys, reason=${reason})`);
    return keys.length;
  } catch (error) {
    console.warn('[CACHE SKIP] Redis unavailable', error);
    return 0;
  }
}
