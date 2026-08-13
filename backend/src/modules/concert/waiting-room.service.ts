import { Injectable } from '@nestjs/common';
import type { ConcertStatus } from '@prisma/client';
import { randomUUID } from 'crypto';
import { PrismaService } from '../../shared/modules/prisma.service';
import redisClient, { isRedisReady, runRedisOperation } from '../../shared/lib/redis';
import { AppError } from '../../shared/lib/errors';

const PUBLIC_CONCERT_STATUSES: ConcertStatus[] = ['PUBLISHED', 'ON_SALE'];
const DEFAULT_RELEASE_PER_MINUTE = 500;
const DEFAULT_CHECKOUT_TOKEN_TTL_SECONDS = 300;

type WaitingRoomStatus =
  | { status: 'WAITING'; position: number }
  | { status: 'READY'; checkoutToken: string; expiresInSeconds: number };

function readPositiveInteger(value: string | undefined, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function parseEnabledConcertIds() {
  return new Set(
    (process.env.WAITING_ROOM_ENABLED_CONCERT_IDS || '')
      .split(',')
      .map((id) => id.trim())
      .filter(Boolean)
  );
}

export function buildWaitingRoomQueueKey(concertId: string) {
  return `waiting:${concertId}:queue`;
}

export function buildCheckoutTokenKey(concertId: string, userId: string) {
  return `checkout_token:${concertId}:${userId}`;
}

export function getCheckoutTokenTtlSeconds() {
  return readPositiveInteger(process.env.CHECKOUT_TOKEN_TTL_SECONDS, DEFAULT_CHECKOUT_TOKEN_TTL_SECONDS);
}

export function getWaitingRoomReleasePerMinute() {
  return readPositiveInteger(process.env.WAITING_ROOM_RELEASE_PER_MINUTE, DEFAULT_RELEASE_PER_MINUTE);
}

export function isWaitingRoomEnabled(concertId: string) {
  return parseEnabledConcertIds().has(concertId);
}

@Injectable()
export class WaitingRoomService {
  constructor(private readonly prisma: PrismaService) {}

  public async join(concertId: string, userId: string): Promise<WaitingRoomStatus> {
    await this.assertWaitingRoomAvailable(concertId);

    const tokenStatus = await this.getReadyStatus(concertId, userId);
    if (tokenStatus) {
      return tokenStatus;
    }

    const queueKey = buildWaitingRoomQueueKey(concertId);
    await this.assertRedisReady();

    const existingRank = await runRedisOperation(() => redisClient.zRank(queueKey, userId));
    if (existingRank !== null) {
      return { status: 'WAITING', position: existingRank + 1 };
    }

    await runRedisOperation(() =>
      redisClient.zAdd(queueKey, {
        score: Date.now(),
        value: userId,
      })
    );

    const rank = await runRedisOperation(() => redisClient.zRank(queueKey, userId));
    return { status: 'WAITING', position: (rank ?? 0) + 1 };
  }

  public async getStatus(concertId: string, userId: string): Promise<WaitingRoomStatus> {
    await this.assertWaitingRoomAvailable(concertId);

    const tokenStatus = await this.getReadyStatus(concertId, userId);
    if (tokenStatus) {
      return tokenStatus;
    }

    await this.assertRedisReady();

    const rank = await runRedisOperation(() => redisClient.zRank(buildWaitingRoomQueueKey(concertId), userId));
    if (rank === null) {
      throw new AppError(404, 'WAITING_ROOM_NOT_FOUND', 'Bạn chưa ở trong hàng chờ của concert này.');
    }

    return { status: 'WAITING', position: rank + 1 };
  }

  public async releaseWaitingRooms() {
    const concertIds = Array.from(parseEnabledConcertIds());
    if (concertIds.length === 0) {
      return [];
    }

    if (!isRedisReady()) {
      console.warn('[WaitingRoom] Redis unavailable, skip release cycle');
      return [];
    }

    const results = [];
    for (const concertId of concertIds) {
      results.push(await this.releaseForConcert(concertId));
    }
    return results;
  }

  public async releaseForConcert(concertId: string) {
    const queueKey = buildWaitingRoomQueueKey(concertId);
    const limit = getWaitingRoomReleasePerMinute();
    const ttlSeconds = getCheckoutTokenTtlSeconds();

    const userIds = await runRedisOperation(() => redisClient.zRange(queueKey, 0, limit - 1));
    for (const userId of userIds) {
      const token = randomUUID();
      await runRedisOperation(() => redisClient.setEx(buildCheckoutTokenKey(concertId, userId), ttlSeconds, token));
      await runRedisOperation(() => redisClient.zRem(queueKey, userId));
    }

    if (userIds.length > 0) {
      console.log(`[WaitingRoom] Released ${userIds.length} checkout token(s) for concert ${concertId}`);
    }

    return { concertId, released: userIds.length };
  }

  public async validateCheckoutTokenForHold(concertId: string, userId: string, providedToken: string | undefined) {
    if (!isWaitingRoomEnabled(concertId)) {
      return;
    }

    if (!providedToken) {
      throw new AppError(403, 'NOT_YOUR_TURN', 'Bạn chưa tới lượt mua vé.');
    }

    await this.assertRedisReady();

    const savedToken = await runRedisOperation(() => redisClient.get(buildCheckoutTokenKey(concertId, userId)));
    if (!savedToken) {
      throw new AppError(403, 'CHECKOUT_TOKEN_EXPIRED', 'Checkout token đã hết hạn, vui lòng vào lại hàng chờ.');
    }

    if (savedToken !== providedToken) {
      throw new AppError(403, 'NOT_YOUR_TURN', 'Bạn chưa tới lượt mua vé.');
    }
  }

  private async assertWaitingRoomAvailable(concertId: string) {
    const concert = await this.prisma.concert.findFirst({
      where: {
        id: concertId,
        status: { in: PUBLIC_CONCERT_STATUSES },
      },
      select: { id: true },
    });

    if (!concert) {
      throw new AppError(404, 'CONCERT_NOT_AVAILABLE', 'Concert không khả dụng để tham gia hàng chờ.');
    }

    if (!isWaitingRoomEnabled(concertId)) {
      throw new AppError(404, 'WAITING_ROOM_NOT_FOUND', 'Concert này không bật waiting room.');
    }
  }

  private async getReadyStatus(concertId: string, userId: string): Promise<WaitingRoomStatus | null> {
    await this.assertRedisReady();

    const tokenKey = buildCheckoutTokenKey(concertId, userId);
    const token = await runRedisOperation(() => redisClient.get(tokenKey));
    if (!token) {
      return null;
    }

    const ttl = await runRedisOperation(() => redisClient.ttl(tokenKey));
    return {
      status: 'READY',
      checkoutToken: token,
      expiresInSeconds: ttl > 0 ? ttl : getCheckoutTokenTtlSeconds(),
    };
  }

  private async assertRedisReady() {
    if (!isRedisReady()) {
      throw new AppError(503, 'WAITING_ROOM_NOT_FOUND', 'Waiting room tạm thời chưa khả dụng.');
    }
  }
}
