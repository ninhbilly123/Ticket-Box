import { NextFunction, Request, Response } from 'express';
import redisClient, { isRedisReady, runRedisOperation } from '../lib/redis';

const WINDOW_SECONDS = 60;
const DEFAULT_DETAIL_LIMIT = 120;
const DEFAULT_AVAILABILITY_LIMIT = 60;
const TOO_MANY_REQUESTS_MESSAGE = 'Bạn gửi quá nhiều request, vui lòng thử lại sau.';

function readPositiveInteger(value: string | undefined, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function getClientIp(req: Request) {
  const forwardedFor = req.headers['x-forwarded-for'];
  const rawIp = Array.isArray(forwardedFor)
    ? forwardedFor[0]
    : forwardedFor?.split(',')[0] || req.ip || req.socket.remoteAddress || 'unknown';
  return rawIp.trim().replace(/^::ffff:/, '');
}

function createIpRateLimit(options: {
  limitEnvName: string;
  defaultLimit: number;
  keyPrefix: 'concert-detail' | 'concert-availability';
}) {
  return async function concertIpRateLimit(req: Request, res: Response, next: NextFunction) {
    const concertId = req.params.id;
    const limit = readPositiveInteger(process.env[options.limitEnvName], options.defaultLimit);
    const key = `rate_limit:ip:${encodeURIComponent(getClientIp(req))}:${options.keyPrefix}:${encodeURIComponent(concertId)}`;

    try {
      if (!isRedisReady()) {
        console.warn('[RATE LIMIT SKIP] Redis unavailable');
        return next();
      }

      const current = await runRedisOperation(() => redisClient.incr(key));
      if (current === 1) {
        await runRedisOperation(() => redisClient.expire(key, WINDOW_SECONDS));
      }

      if (current > limit) {
        return res.status(429).json({
          success: false,
          errorCode: 'TOO_MANY_REQUESTS',
          message: TOO_MANY_REQUESTS_MESSAGE,
          error: {
            code: 'TOO_MANY_REQUESTS',
            message: TOO_MANY_REQUESTS_MESSAGE,
          },
        });
      }

      return next();
    } catch (error) {
      console.warn('[RATE LIMIT SKIP] Redis unavailable', error);
      return next();
    }
  };
}

export const concertDetailRateLimit = createIpRateLimit({
  limitEnvName: 'CONCERT_DETAIL_RATE_LIMIT_PER_MINUTE',
  defaultLimit: DEFAULT_DETAIL_LIMIT,
  keyPrefix: 'concert-detail',
});

export const concertAvailabilityRateLimit = createIpRateLimit({
  limitEnvName: 'CONCERT_AVAILABILITY_RATE_LIMIT_PER_MINUTE',
  defaultLimit: DEFAULT_AVAILABILITY_LIMIT,
  keyPrefix: 'concert-availability',
});
