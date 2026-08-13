import { Controller, Get, Post, Patch, Param, Body, UseGuards, Res } from '@nestjs/common';
import { Response } from 'express';
import { z } from 'zod';
import { AuthGuard } from '../../shared/guards/auth.guard';
import { RolesGuard } from '../../shared/guards/roles.guard';
import { Roles } from '../../shared/decorators/roles.decorator';
import { CurrentUser } from '../../shared/decorators/current-user.decorator';
import { AuthUser } from '../../shared/types/auth';
import { VipGuestSyncService } from './vip-guest-sync.service';

const eventCodeListSchema = z.array(z.string().trim().min(1).max(64)).optional();

const sponsorEmailCreateSchema = z.object({
  email: z.string().email(),
  displayName: z.string().trim().min(1).max(200).optional(),
  allowedEventCodes: eventCodeListSchema,
});

const sponsorEmailUpdateSchema = z.object({
  displayName: z.string().trim().min(1).max(200).optional(),
  isActive: z.boolean().optional(),
  allowedEventCodes: eventCodeListSchema,
}).strict().refine((data) => Object.keys(data).length > 0, {
  message: 'At least one sponsor email field is required.',
});

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
  async createSponsorEmail(@CurrentUser() user: AuthUser, @Body() body: unknown, @Res() res: Response) {
    const dto = sponsorEmailCreateSchema.parse(body);
    const data = await this.vipGuestSyncService.createSponsorEmail({
      email: dto.email,
      displayName: dto.displayName,
      allowedEventCodes: dto.allowedEventCodes,
      user,
    });
    return res.status(201).json({ success: true, data });
  }

  @Patch('sponsors/:id')
  async updateSponsorEmail(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() body: unknown,
    @Res() res: Response
  ) {
    const dto = sponsorEmailUpdateSchema.parse(body);
    const data = await this.vipGuestSyncService.updateSponsorEmail(id, {
      displayName: dto.displayName,
      isActive: dto.isActive,
      allowedEventCodes: dto.allowedEventCodes,
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
