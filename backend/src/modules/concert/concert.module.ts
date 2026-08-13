import { MiddlewareConsumer, Module, NestModule, RequestMethod } from '@nestjs/common';
import { ConcertController } from './concert.controller';
import { ConcertService } from './concert.service';
import { WaitingRoomService } from './waiting-room.service';
import { concertListRateLimit } from '../../shared/middleware/concertListRateLimit';
import { concertDetailRateLimit, concertAvailabilityRateLimit } from '../../shared/middleware/concertPublicRateLimit';

@Module({
  controllers: [ConcertController],
  providers: [ConcertService, WaitingRoomService],
  exports: [ConcertService, WaitingRoomService],
})
export class ConcertModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(concertListRateLimit)
      .forRoutes({ path: 'api/v1/concerts', method: RequestMethod.GET });
    consumer
      .apply(concertAvailabilityRateLimit)
      .forRoutes({ path: 'api/v1/concerts/:id/availability', method: RequestMethod.GET });
    consumer
      .apply(concertDetailRateLimit)
      .forRoutes({ path: 'api/v1/concerts/:id', method: RequestMethod.GET });
  }
}
