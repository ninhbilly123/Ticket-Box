import { MiddlewareConsumer, Module, NestModule, RequestMethod } from '@nestjs/common';
import { PaymentController } from './payment.controller';
import { PaymentService } from './payment.service';
import { PrismaModule } from '../../shared/modules/prisma.module';
import { idempotencyMiddleware } from '../../shared/middleware/idempotency';
import { PaymentCacheService } from './payment-cache.service';
import { PaymentCircuitBreakerService } from './payment-circuit-breaker.service';
import { VnpayGatewayService } from './vnpay-gateway.service';

@Module({
  imports: [PrismaModule],
  controllers: [PaymentController],
  providers: [PaymentService, PaymentCacheService, PaymentCircuitBreakerService, VnpayGatewayService],
})
export class PaymentModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(idempotencyMiddleware).forRoutes({ path: 'api/v1/payments', method: RequestMethod.POST });
  }
}
