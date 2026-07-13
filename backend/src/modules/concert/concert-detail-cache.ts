import redisClient, { isRedisReady, runRedisOperation } from '../../shared/lib/redis';

const DEFAULT_DETAIL_CACHE_TTL_SECONDS = 120;
const DEFAULT_AVAILABILITY_CACHE_TTL_SECONDS = 5;

export function buildConcertDetailCacheKey(concertId: string) {
  return `concert:detail:${concertId}`;
}

export function buildTicketAvailabilityCacheKey(concertId: string) {
  return `ticket:availability:${concertId}`;
}

function readBoundedTtl(value: string | undefined, fallback: number, min: number, max: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }
  return Math.min(max, Math.max(min, Math.floor(parsed)));
}

function getDetailCacheTtlSeconds() {
  return readBoundedTtl(process.env.CONCERT_DETAIL_CACHE_TTL, DEFAULT_DETAIL_CACHE_TTL_SECONDS, 60, 300);
}

function getAvailabilityCacheTtlSeconds() {
  return readBoundedTtl(
    process.env.CONCERT_AVAILABILITY_CACHE_TTL,
    DEFAULT_AVAILABILITY_CACHE_TTL_SECONDS,
    3,
    5
  );
}

async function readCache<T>(cacheKey: string, label: string): Promise<T | null> {
  try {
    if (!isRedisReady()) {
      console.warn(`[CACHE SKIP] Redis unavailable (${label})`);
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
    console.warn(`[CACHE SKIP] Redis unavailable (${label})`, error);
    return null;
  }
}

async function writeCache(cacheKey: string, value: unknown, ttlSeconds: number, label: string) {
  try {
    if (!isRedisReady()) {
      console.warn(`[CACHE SKIP] Redis unavailable (${label})`);
      return;
    }

    await runRedisOperation(() => redisClient.setEx(cacheKey, ttlSeconds, JSON.stringify(value)));
  } catch (error) {
    console.warn(`[CACHE SKIP] Redis unavailable (${label})`, error);
  }
}

export function readConcertDetailCache<T>(concertId: string) {
  return readCache<T>(buildConcertDetailCacheKey(concertId), 'concert-detail');
}

export function writeConcertDetailCache(concertId: string, value: unknown) {
  return writeCache(buildConcertDetailCacheKey(concertId), value, getDetailCacheTtlSeconds(), 'concert-detail');
}

export function readTicketAvailabilityCache<T>(concertId: string) {
  return readCache<T>(buildTicketAvailabilityCacheKey(concertId), 'ticket-availability');
}

export function writeTicketAvailabilityCache(concertId: string, value: unknown) {
  return writeCache(
    buildTicketAvailabilityCacheKey(concertId),
    value,
    getAvailabilityCacheTtlSeconds(),
    'ticket-availability'
  );
}

export async function invalidateConcertDetailCache(concertId?: string, reason = 'manual') {
  if (!concertId) {
    console.warn(`[CACHE SKIP] Missing concertId for detail invalidation (reason=${reason})`);
    return 0;
  }

  const keys = [buildConcertDetailCacheKey(concertId), buildTicketAvailabilityCacheKey(concertId)];
  try {
    if (!isRedisReady()) {
      console.warn('[CACHE SKIP] Redis unavailable (concert-detail invalidation)');
      return 0;
    }

    const deleted = await runRedisOperation(() => redisClient.del(keys));
    console.log(`[CACHE INVALIDATED] concert detail (${deleted} keys, concertId=${concertId}, reason=${reason})`);
    return deleted;
  } catch (error) {
    console.warn('[CACHE SKIP] Redis unavailable (concert-detail invalidation)', error);
    return 0;
  }
}

export async function invalidateTicketAvailabilityCache(concertId?: string, reason = 'manual') {
  if (!concertId) {
    console.warn(`[CACHE SKIP] Missing concertId for availability invalidation (reason=${reason})`);
    return 0;
  }

  const cacheKey = buildTicketAvailabilityCacheKey(concertId);
  try {
    if (!isRedisReady()) {
      console.warn('[CACHE SKIP] Redis unavailable (ticket availability invalidation)');
      return 0;
    }

    const deleted = await runRedisOperation(() => redisClient.del(cacheKey));
    console.log(`[CACHE INVALIDATED] ticket availability (${deleted} keys, concertId=${concertId}, reason=${reason})`);
    return deleted;
  } catch (error) {
    console.warn('[CACHE SKIP] Redis unavailable (ticket availability invalidation)', error);
    return 0;
  }
}
