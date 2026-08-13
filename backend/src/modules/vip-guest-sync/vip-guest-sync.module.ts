import { Module } from '@nestjs/common';
import { VipGuestSyncController } from './vip-guest-sync.controller';
import { VipGuestSyncService } from './vip-guest-sync.service';
import { PrismaModule } from '../../shared/modules/prisma.module';
import { RbacModule } from '../rbac/rbac.module';

@Module({
  imports: [PrismaModule, RbacModule],
  controllers: [VipGuestSyncController],
  providers: [VipGuestSyncService],
  exports: [VipGuestSyncService],
})
export class VipGuestSyncModule {}
