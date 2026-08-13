import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { InternalController } from './internal.controller';
import { AdminService } from './admin.service';
import { PrismaModule } from '../../shared/modules/prisma.module';
import { RbacModule } from '../rbac/rbac.module';

@Module({
  imports: [PrismaModule, RbacModule],
  controllers: [AdminController, InternalController],
  providers: [AdminService],
  exports: [AdminService],
})
export class AdminModule {}
