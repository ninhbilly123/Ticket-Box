import { MiddlewareConsumer, Module, NestModule, RequestMethod } from '@nestjs/common';
import { OrderController } from './order.controller';
import { OrderHoldService } from './order-hold.service';
import { PrismaModule } from '../../shared/modules/prisma.module';
import {
  holdOrderRateLimit,
  requireCheckoutTokenForHotConcert,
} from '../../shared/middleware/holdOrderProtection';

@Module({
  imports: [PrismaModule],
  controllers: [OrderController],
  providers: [OrderHoldService],
  exports: [OrderHoldService],
})
export class OrderModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(holdOrderRateLimit, requireCheckoutTokenForHotConcert)
      .forRoutes({ path: 'api/v1/orders/hold', method: RequestMethod.POST });
  }
}
