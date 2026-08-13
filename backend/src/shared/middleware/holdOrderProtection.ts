import { NextFunction, Request, Response } from 'express';
import redisClient, { isRedisReady, runRedisOperation } from '../lib/redis';
import { AppError } from '../lib/errors';
import { WaitingRoomService } from '../../modules/concert/waiting-room.service';
import { prisma } from '../lib/prisma';
import { PrismaService } from '../modules/prisma.service';

const waitingRoomService = new WaitingRoomService(prisma as unknown as PrismaService);

const DEFAULT_WINDOW_SECONDS = 60;
const DEFAULT_USER_LIMIT = 5;
const DEFAULT_IP_LIMIT = 20;
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

async function incrementLimitCounter(key: string, windowSeconds: number) {
  const current = await runRedisOperation(() => redisClient.incr(key));
  if (current === 1) {
    await runRedisOperation(() => redisClient.expire(key, windowSeconds));
  }
  return current;
}

function tooManyRequestsResponse(res: Response) {
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

export async function holdOrderRateLimit(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user) {
      throw new AppError(401, 'AUTH_TOKEN_EXPIRED', 'Authentication is required.');
    }

    if (!isRedisReady()) {
      console.warn('[HoldOrderRateLimit] Redis unavailable, skip rate limit');
      return next();
    }

    const windowSeconds = readPositiveInteger(
      process.env.HOLD_ORDER_RATE_LIMIT_WINDOW_SECONDS,
      DEFAULT_WINDOW_SECONDS
    );
    const userLimit = readPositiveInteger(process.env.HOLD_ORDER_USER_RATE_LIMIT, DEFAULT_USER_LIMIT);
    const ipLimit = readPositiveInteger(process.env.HOLD_ORDER_IP_RATE_LIMIT, DEFAULT_IP_LIMIT);
    const userKey = `rate_limit:user:${encodeURIComponent(req.user.id)}:hold-order`;
    const ipKey = `rate_limit:ip:${encodeURIComponent(getClientIp(req))}:hold-order`;

    const userCount = await incrementLimitCounter(userKey, windowSeconds);
    const ipCount = await incrementLimitCounter(ipKey, windowSeconds);

    if (userCount > userLimit || ipCount > ipLimit) {
      return tooManyRequestsResponse(res);
    }

    return next();
  } catch (error) {
    if (error instanceof AppError) {
      return next(error);
    }

    console.warn('[HoldOrderRateLimit] Redis unavailable, skip rate limit', error);
    return next();
  }
}

export async function requireCheckoutTokenForHotConcert(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user) {
      throw new AppError(401, 'AUTH_TOKEN_EXPIRED', 'Authentication is required.');
    }

    const concertId = typeof req.body?.concertId === 'string' ? req.body.concertId : undefined;
    if (!concertId) {
      return next();
    }

    const checkoutTokenHeader = req.header('Checkout-Token');
    await waitingRoomService.validateCheckoutTokenForHold(concertId, req.user.id, checkoutTokenHeader || undefined);
    return next();
  } catch (error) {
    return next(error);
  }
}
