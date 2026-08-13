import { MiddlewareConsumer, Module, NestModule, RequestMethod } from '@nestjs/common';
import { PaymentController } from './payment.controller';
import { PaymentService } from './payment.service';
import { PrismaModule } from '../../shared/modules/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [PaymentController],
  providers: [PaymentService],
})
export class PaymentModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    const { idempotencyMiddleware } = require('../../shared/middleware/idempotency');
    consumer.apply(idempotencyMiddleware).forRoutes({ path: 'api/v1/payments', method: RequestMethod.POST });
  }
}
