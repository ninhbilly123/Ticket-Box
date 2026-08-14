import { Module } from '@nestjs/common';
import { CheckinController } from './checkin.controller';
import { CheckinStatsService } from './checkin-stats.service';
import { CheckinService } from './checkin.service';
import { PrismaModule } from '../../shared/modules/prisma.module';
import { RbacModule } from '../rbac/rbac.module';

@Module({
  imports: [PrismaModule, RbacModule],
  controllers: [CheckinController],
  providers: [CheckinService, CheckinStatsService],
  exports: [CheckinStatsService],
})
export class CheckinModule {}
