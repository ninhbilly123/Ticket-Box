import { Injectable, Logger } from '@nestjs/common';
import { AppError } from '../../shared/lib/errors';
import redisClient, { isRedisReady, runRedisOperation } from '../../shared/lib/redis';

@Injectable()
export class PaymentCircuitBreakerService {
  private readonly logger = new Logger(PaymentCircuitBreakerService.name);

  public async check(gateway: string): Promise<void> {
    if (!isRedisReady()) return;

    const stateKey = this.stateKey(gateway);
    const state = await runRedisOperation(() => redisClient.get(stateKey));

    if (state === 'OPEN') {
      throw new AppError(
        503,
        'PAYMENT_GATEWAY_MAINTENANCE',
        `Cong thanh toan ${gateway.toUpperCase()} hien dang gap su co va dang trong qua trinh bao tri. Vui long chon cong thanh toan khac hoac thu lai sau.`
      );
    }
  }

  public async recordFailure(gateway: string): Promise<void> {
    if (!isRedisReady()) return;

    const failureKey = this.failureKey(gateway);
    const stateKey = this.stateKey(gateway);

    const failures = await runRedisOperation(() => redisClient.incr(failureKey));
    await runRedisOperation(() => redisClient.expire(failureKey, 300));

    this.logger.log(`[Circuit Breaker] Gateway ${gateway} failure count: ${failures}/5`);

    if (failures >= 5) {
      this.logger.warn(`[Circuit Breaker] Tripping breaker for gateway ${gateway}. State set to OPEN.`);
      await runRedisOperation(() => redisClient.setEx(stateKey, 60, 'OPEN'));
      await runRedisOperation(() => redisClient.del(failureKey));
    }
  }

  public async recordSuccess(gateway: string): Promise<void> {
    if (!isRedisReady()) return;

    await runRedisOperation(() => redisClient.del(this.failureKey(gateway)));
    await runRedisOperation(() => redisClient.del(this.stateKey(gateway)));
    this.logger.log(`[Circuit Breaker] Gateway ${gateway} status reset to CLOSED.`);
  }

  private failureKey(gateway: string): string {
    return `circuit_breaker:${gateway}:failures`;
  }

  private stateKey(gateway: string): string {
    return `circuit_breaker:${gateway}:state`;
  }
}
