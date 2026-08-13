import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { InternalController } from './internal.controller';
import { AdminService } from './admin.service';
import { AdminReadinessService } from './admin-readiness.service';
import { PrismaModule } from '../../shared/modules/prisma.module';
import { RbacModule } from '../rbac/rbac.module';

@Module({
  imports: [PrismaModule, RbacModule],
  controllers: [AdminController, InternalController],
  providers: [AdminService, AdminReadinessService],
  exports: [AdminService],
})
export class AdminModule {}
