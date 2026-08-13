import { Controller, Get, UseGuards } from '@nestjs/common';
import { AdminService } from './admin.service';
import { AuthGuard } from '../../shared/guards/auth.guard';
import { RolesGuard } from '../../shared/guards/roles.guard';
import { Roles } from '../../shared/decorators/roles.decorator';

@Controller('api/v1/internal')
@UseGuards(AuthGuard, RolesGuard)
@Roles('ORGANIZER')
export class InternalController {
  constructor(private readonly adminService: AdminService) {}

  @Get('whitelist-email-configs/active')
  async listActiveWhitelistConfigs() {
    const result = await this.adminService.listActiveWhitelistConfigs();
    return { success: true, data: result };
  }
}
