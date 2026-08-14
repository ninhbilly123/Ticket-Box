import { Injectable, Module, OnApplicationBootstrap, Logger } from '@nestjs/common';
import { PrismaModule } from '../shared/modules/prisma.module';
import { OrderModule } from '../modules/order/order.module';
import { ConcertModule } from '../modules/concert/concert.module';
import { VipGuestSyncModule } from '../modules/vip-guest-sync/vip-guest-sync.module';
import { OrderHoldService } from '../modules/order/order-hold.service';
import { WaitingRoomService } from '../modules/concert/waiting-room.service';
import { VipGuestSyncService } from '../modules/vip-guest-sync/vip-guest-sync.service';

@Injectable()
export class WorkerOrchestratorService implements OnApplicationBootstrap {
  private readonly logger = new Logger(WorkerOrchestratorService.name);

  constructor(
    private readonly orderHoldService: OrderHoldService,
    private readonly waitingRoomService: WaitingRoomService,
    private readonly vipGuestSyncService: VipGuestSyncService
  ) {}

  async onApplicationBootstrap() {
    this.logger.log('Initializing background workers...');
    
    // Import worker start functions (they remain standalone functions)
    try {
      const { startNotificationWorker } = await import('./notification.worker');
      await startNotificationWorker();
    } catch (e) { this.logger.warn('Notification worker failed to start', e); }

    try {
      const { startConcertListingCacheInvalidationWorker } = await import('./concert-listing-cache-invalidation.worker');
      await startConcertListingCacheInvalidationWorker();
    } catch (e) { this.logger.warn('Concert listing cache worker failed to start', e); }

    try {
      const { startOrderExpirationWorker } = await import('./order-expiration.worker');
      await startOrderExpirationWorker(this.orderHoldService);
    } catch (e) { this.logger.warn('Order expiration worker failed to start', e); }

    try {
      const { startAiBioWorker } = await import('./ai-bio.worker');
      startAiBioWorker();
    } catch (e) { this.logger.warn('AI bio worker failed to start', e); }

    try {
      const { startEmailWorker } = await import('./email.worker');
      startEmailWorker();
    } catch (e) { this.logger.warn('Email worker failed to start', e); }

    try {
      const { startVipGuestSyncWorker } = await import('./vip-guest-sync.worker');
      startVipGuestSyncWorker(this.vipGuestSyncService);
    } catch (e) { this.logger.warn('VIP guest sync worker failed to start', e); }

    try {
      const { startConcertReminderWorker } = await import('./concert-reminder.worker');
      startConcertReminderWorker();
    } catch (e) { this.logger.warn('Concert reminder worker failed to start', e); }

    // Cleanup worker (safety scan for expired orders)
    this.startCleanupWorker();

    // Waiting room release worker
    this.startWaitingRoomWorker();

    this.logger.log('All background workers initialized.');
  }

  private startCleanupWorker() {
    this.logger.log('[Cleanup Worker] Background cleanup worker initialized (safety scan every 60s)...');
    setInterval(async () => {
      try {
        const results = await this.orderHoldService.expireOldPendingOrders();
        const expired = results.filter((r) => r.result === 'expired');
        for (const result of expired) {
          const { invalidateTicketAvailabilityCache } = await import('../modules/concert/concert-detail-cache');
          await invalidateTicketAvailabilityCache(result.concertId, 'cleanup.expired');
          this.logger.log(`[Cleanup Worker] Expired pending order ${result.orderId}`);
        }
      } catch (error) {
        this.logger.error('[Cleanup Worker] Error running order cleanup:', error);
      }
    }, 60_000);
  }

  private startWaitingRoomWorker() {
    this.logger.log('[WaitingRoomWorker] Started');
    setInterval(async () => {
      try {
        await this.waitingRoomService.releaseWaitingRooms();
      } catch (error) {
        this.logger.error('[WaitingRoomWorker] Release cycle failed', error);
      }
    }, 60_000);
  }
}

@Module({
  imports: [PrismaModule, OrderModule, ConcertModule, VipGuestSyncModule],
  providers: [WorkerOrchestratorService],
})
export class WorkersModule {}
