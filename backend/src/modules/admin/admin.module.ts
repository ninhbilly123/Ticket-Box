import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { InternalController } from './internal.controller';
import { AdminConcertAccessService } from './admin-concert-access.service';
import { AdminService } from './admin.service';
import { AdminReadinessService } from './admin-readiness.service';
import { AdminTicketTypeService } from './admin-ticket-type.service';
import { PrismaModule } from '../../shared/modules/prisma.module';
import { RbacModule } from '../rbac/rbac.module';
import { CheckinModule } from '../checkin/checkin.module';

@Module({
  imports: [PrismaModule, RbacModule, CheckinModule],
  controllers: [AdminController, InternalController],
  providers: [AdminService, AdminConcertAccessService, AdminReadinessService, AdminTicketTypeService],
  exports: [AdminService],
})
export class AdminModule {}
