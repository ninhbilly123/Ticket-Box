import { Request, Response, NextFunction } from 'express';
import redisClient, { isRedisReady, runRedisOperation } from '../lib/redis';

/**
 * Middleware to enforce idempotency on POST/PUT requests using an Idempotency-Key header.
 */
export async function idempotencyMiddleware(req: Request, res: Response, next: NextFunction) {
  // Only apply to state-modifying requests (POST/PUT/PATCH)
  if (!['POST', 'PUT', 'PATCH'].includes(req.method)) {
    return next();
  }

  const idempotencyKey = req.headers['idempotency-key'] as string;

  // If no key is provided, skip idempotency check (standard non-idempotent request)
  if (!idempotencyKey) {
    return next();
  }

  const redisKey = `idempotency:${idempotencyKey}`;

  try {
    if (!isRedisReady()) {
      // If Redis is down, fallback to normal execution
      return next();
    }

    const cachedStatus = await runRedisOperation(() => redisClient.get(redisKey));

    if (cachedStatus) {
      if (cachedStatus === 'PROCESSING') {
        // 409 Conflict: Another request with the same key is still processing
        return res.status(409).json({
          success: false,
          error: {
            code: 'IDEMPOTENCY_CONFLICT',
            message: 'Yêu cầu trùng lặp đang được xử lý, vui lòng thử lại sau ít phút.',
          },
        });
      }

      // If it exists and has a JSON payload, it means the request completed.
      // Return the cached response directly.
      const cachedResponse = JSON.parse(cachedStatus);
      return res.status(cachedResponse.status).json(cachedResponse.body);
    }

    // Set lock status atomically so concurrent requests with the same key cannot both proceed.
    const lockResult = await runRedisOperation(() =>
      redisClient.set(redisKey, 'PROCESSING', { EX: 120, NX: true })
    );
    if (lockResult !== 'OK') {
      return res.status(409).json({
        success: false,
        error: {
          code: 'IDEMPOTENCY_CONFLICT',
          message: 'Yêu cầu trùng lặp đang được xử lý, vui lòng thử lại sau ít phút.',
        },
      });
    }

    // Override res.json to capture and cache the response when it finishes
    const originalJson = res.json;
    res.json = function (body: any) {
      res.json = originalJson; // Restore original

      // Cache the completed response with 24 hours TTL
      const cacheValue = JSON.stringify({
        status: res.statusCode,
        body,
      });

      runRedisOperation(() => redisClient.setEx(redisKey, 86400, cacheValue)).catch((err) => {
        console.error(`[Redis Idempotency Write Error] Failed to cache response for ${idempotencyKey}:`, err);
      });

      return originalJson.call(this, body);
    };

    next();
  } catch (err) {
    console.error('[Idempotency Error] Failed to process idempotency check:', err);
    next();
  }
}
