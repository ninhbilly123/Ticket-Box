import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { AllExceptionsFilter } from './shared/filters/http-exception.filter';
import { AuthMiddleware } from './shared/middleware/auth.nestjs-middleware';
import { PrismaModule } from './shared/modules/prisma.module';
import { RbacModule } from './modules/rbac/rbac.module';
import { AuthModule } from './modules/auth/auth.module';
import { AdminModule } from './modules/admin/admin.module';
import { ConcertModule } from './modules/concert/concert.module';
import { OrderModule } from './modules/order/order.module';
import { TicketModule } from './modules/ticket/ticket.module';
import { PaymentModule } from './modules/payment/payment.module';
import { CheckinModule } from './modules/checkin/checkin.module';
import { AiModule } from './modules/ai/ai.module';
import { VipGuestSyncModule } from './modules/vip-guest-sync/vip-guest-sync.module';
import { HealthModule } from './modules/health/health.module';
import { WorkersModule } from './workers/workers.module';

@Module({
  imports: [
    PrismaModule,
    RbacModule,
    AuthModule,
    AdminModule,
    ConcertModule,
    OrderModule,
    TicketModule,
    PaymentModule,
    CheckinModule,
    AiModule,
    VipGuestSyncModule,
    HealthModule,
    WorkersModule,
  ],
  providers: [
    {
      provide: APP_FILTER,
      useClass: AllExceptionsFilter,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(AuthMiddleware).forRoutes('*');
  }
}
