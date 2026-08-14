import { Injectable, Logger } from '@nestjs/common';
import redisClient, { isRedisReady, runRedisOperation } from '../../shared/lib/redis';

@Injectable()
export class PaymentCacheService {
  private readonly logger = new Logger(PaymentCacheService.name);

  public async invalidateTicketInventories(ticketTypeIds: string[]): Promise<void> {
    for (const ticketTypeId of ticketTypeIds) {
      const cacheKey = `ticket_inventory:${ticketTypeId}`;
      try {
        if (isRedisReady()) {
          await runRedisOperation(() => redisClient.del(cacheKey));
        }
      } catch (err) {
        this.logger.error(`[Redis Invalidation Error] Failed to delete key ${cacheKey}.`, err instanceof Error ? err.stack : String(err));
      }
    }
  }
}
