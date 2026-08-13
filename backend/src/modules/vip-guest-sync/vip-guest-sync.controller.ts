import { Controller, Get, Post, Patch, Param, Body, UseGuards, Res } from '@nestjs/common';
import { Response } from 'express';
import { AuthGuard } from '../../shared/guards/auth.guard';
import { RolesGuard } from '../../shared/guards/roles.guard';
import { Roles } from '../../shared/decorators/roles.decorator';
import { CurrentUser } from '../../shared/decorators/current-user.decorator';
import { AuthUser } from '../../shared/types/auth';
import { VipGuestSyncService } from './vip-guest-sync.service';

@Controller('api/v1/vip-guest-sync')
@UseGuards(AuthGuard, RolesGuard)
@Roles('ORGANIZER')
export class VipGuestSyncController {
  constructor(private readonly vipGuestSyncService: VipGuestSyncService) {}

  @Get('sponsors')
  async listSponsorEmails(@CurrentUser() user: AuthUser, @Res() res: Response) {
    const data = await this.vipGuestSyncService.listSponsorEmails(user);
    return res.status(200).json({ success: true, data });
  }

  @Post('sponsors')
  async createSponsorEmail(@CurrentUser() user: AuthUser, @Body() body: any, @Res() res: Response) {
    const { email, displayName, allowedEventCodes } = body;
    const data = await this.vipGuestSyncService.createSponsorEmail({
      email,
      displayName,
      allowedEventCodes,
      user,
    });
    return res.status(201).json({ success: true, data });
  }

  @Patch('sponsors/:id')
  async updateSponsorEmail(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() body: any,
    @Res() res: Response
  ) {
    const { displayName, isActive, allowedEventCodes } = body;
    const data = await this.vipGuestSyncService.updateSponsorEmail(id, {
      displayName,
      isActive,
      allowedEventCodes,
      user,
    });
    return res.status(200).json({ success: true, data });
  }

  @Get('import-reports')
  async listImportReports(@CurrentUser() user: AuthUser, @Res() res: Response) {
    const data = await this.vipGuestSyncService.listImportReports(user);
    return res.status(200).json({ success: true, data });
  }

  @Get('import-reports/:id')
  async getImportReport(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Res() res: Response
  ) {
    const data = await this.vipGuestSyncService.getImportReport(id, user);
    return res.status(200).json({ success: true, data });
  }
}
