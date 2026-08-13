import { MiddlewareConsumer, Module, NestModule, RequestMethod } from '@nestjs/common';
import { PaymentController } from './payment.controller';
import { PaymentService } from './payment.service';
import { PrismaModule } from '../../shared/modules/prisma.module';
import { idempotencyMiddleware } from '../../shared/middleware/idempotency';

@Module({
  imports: [PrismaModule],
  controllers: [PaymentController],
  providers: [PaymentService],
})
export class PaymentModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(idempotencyMiddleware).forRoutes({ path: 'api/v1/payments', method: RequestMethod.POST });
  }
}
