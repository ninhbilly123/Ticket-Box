import { Controller, Get, Post, Param, Body, UseGuards, Res, Query } from '@nestjs/common';
import { Response } from 'express';
import { z } from 'zod';
import { AuthGuard } from '../../shared/guards/auth.guard';
import { RolesGuard } from '../../shared/guards/roles.guard';
import { Roles } from '../../shared/decorators/roles.decorator';
import { CurrentUser } from '../../shared/decorators/current-user.decorator';
import { CheckinService } from './checkin.service';
import { AuthUser } from '../../shared/types/auth';

const scanTicketSchema = z.object({
  concertId: z.string().uuid(),
  qrCode: z.string().trim().min(1),
  deviceId: z.string().trim().min(1).optional(),
  scannedAt: z.string().datetime({ offset: true }).optional(),
});

const offlineCheckinLogSchema = z.object({
  ticketId: z.string().trim().min(1),
  scannedAtLocal: z.string().datetime({ offset: true }),
});

const syncOfflineLogsSchema = z.object({
  concertId: z.string().uuid(),
  deviceId: z.string().trim().min(1).optional(),
  logs: z.array(offlineCheckinLogSchema).min(1),
});

const vipCheckinSchema = z.object({
  deviceId: z.string().trim().min(1).optional(),
}).default({});

@Controller('api/v1/checkins')
@UseGuards(AuthGuard, RolesGuard)
@Roles('CHECKIN_STAFF')
export class CheckinController {
  constructor(private readonly checkinService: CheckinService) {}

  @Get('concerts')
  async listAssignedConcerts(@CurrentUser() user: AuthUser, @Res() res: Response) {
    const result = await this.checkinService.listAssignedConcerts(user.id);
    return res.status(200).json({ success: true, data: result });
  }

  @Post('scan')
  async scanTicket(@CurrentUser() user: AuthUser, @Body() body: unknown, @Res() res: Response) {
    const dto = scanTicketSchema.parse(body);

    const result = await this.checkinService.scanTicket({
      ticketId: dto.qrCode,
      deviceId: dto.deviceId || 'ONLINE_STAFF',
      scannedAtLocal: dto.scannedAt || new Date().toISOString(),
      concertId: dto.concertId,
      gateStaffId: user.id,
    });

    return res.status(200).json({ success: true, data: result });
  }

  @Post('sync')
  async syncOfflineLogs(@CurrentUser() user: AuthUser, @Body() body: unknown, @Res() res: Response) {
    const dto = syncOfflineLogsSchema.parse(body);

    const result = await this.checkinService.syncOfflineLogs({
      concertId: dto.concertId,
      deviceId: dto.deviceId || 'OFFLINE_SYNC',
      logs: dto.logs,
      gateStaffId: user.id,
    });
    return res.status(200).json({ success: true, data: result });
  }

  @Get('vip-guests')
  async getVipGuests(@CurrentUser() user: AuthUser, @Query('concertId') concertId: string, @Query('query') query: string, @Res() res: Response) {
    const result = await this.checkinService.getVipGuests(String(concertId || ''), String(query || ''), user.id);
    return res.status(200).json({ success: true, data: result });
  }

  @Post('vip-guests/:id/checkin')
  async checkinVipGuest(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() body: unknown,
    @Res() res: Response
  ) {
    const dto = vipCheckinSchema.parse(body);
    const result = await this.checkinService.checkinVipGuest(id, dto.deviceId || 'MANUAL_CHECKIN', user.id);

    return res.status(200).json({ success: true, data: result });
  }

  @Get('stats/:concertId')
  async getCheckinStats(@CurrentUser() user: AuthUser, @Param('concertId') concertId: string, @Res() res: Response) {
    const result = await this.checkinService.getCheckinStats(concertId, user.id);
    return res.status(200).json({ success: true, data: result });
  }
}
