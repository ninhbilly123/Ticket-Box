import { MiddlewareConsumer, Module, NestModule, RequestMethod } from '@nestjs/common';
import { OrderController } from './order.controller';
import { OrderHoldService } from './order-hold.service';
import { PrismaModule } from '../../shared/modules/prisma.module';
import {
  createRequireCheckoutTokenForHotConcert,
  holdOrderRateLimit,
} from '../../shared/middleware/holdOrderProtection';
import { ConcertModule } from '../concert/concert.module';
import { WaitingRoomService } from '../concert/waiting-room.service';

@Module({
  imports: [PrismaModule, ConcertModule],
  controllers: [OrderController],
  providers: [OrderHoldService],
  exports: [OrderHoldService],
})
export class OrderModule implements NestModule {
  constructor(private readonly waitingRoomService: WaitingRoomService) {}

  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(holdOrderRateLimit, createRequireCheckoutTokenForHotConcert(this.waitingRoomService))
      .forRoutes({ path: 'api/v1/orders/hold', method: RequestMethod.POST });
  }
}
