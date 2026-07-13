import { NextFunction, Request, Response } from 'express';
import redisClient, { isRedisReady, runRedisOperation } from '../lib/redis';

const WINDOW_SECONDS = 60;
const DEFAULT_IP_LIMIT = 120;
const DEFAULT_USER_LIMIT = 300;

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

export async function concertListRateLimit(req: Request, res: Response, next: NextFunction) {
  const userLimit = readPositiveInteger(process.env.CONCERT_LIST_RATE_LIMIT_PER_USER_PER_MINUTE, DEFAULT_USER_LIMIT);
  const ipLimit = readPositiveInteger(process.env.CONCERT_LIST_RATE_LIMIT_PER_MINUTE, DEFAULT_IP_LIMIT);
  const key = req.user
    ? `rate_limit:user:${encodeURIComponent(req.user.id)}:concert-list`
    : `rate_limit:ip:${encodeURIComponent(getClientIp(req))}:concert-list`;
  const limit = req.user ? userLimit : ipLimit;

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
        message: 'Bạn gửi quá nhiều request, vui lòng thử lại sau.',
        error: {
          code: 'TOO_MANY_REQUESTS',
          message: 'Bạn gửi quá nhiều request, vui lòng thử lại sau.',
        },
      });
    }

    return next();
  } catch (error) {
    console.warn('[RATE LIMIT SKIP] Redis unavailable', error);
    return next();
  }
}
