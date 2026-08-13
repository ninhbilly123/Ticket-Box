import { Controller, Get, Post, Param, Body, UseGuards, Res, Query } from '@nestjs/common';
import { Response } from 'express';
import { AuthGuard } from '../../shared/guards/auth.guard';
import { RolesGuard } from '../../shared/guards/roles.guard';
import { Roles } from '../../shared/decorators/roles.decorator';
import { CurrentUser } from '../../shared/decorators/current-user.decorator';
import { CheckinService } from './checkin.service';
import { AppError } from '../../shared/lib/errors';
import { AuthUser } from '../../shared/types/auth';

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
  async scanTicket(@CurrentUser() user: AuthUser, @Body() body: any, @Res() res: Response) {
    const { concertId, qrCode, deviceId, scannedAt } = body;

    if (!concertId || !qrCode) {
      throw new AppError(400, 'BAD_REQUEST', 'Thiếu concertId hoặc qrCode.');
    }

    const result = await this.checkinService.scanTicket({
      ticketId: qrCode,
      deviceId: deviceId || 'ONLINE_STAFF',
      scannedAtLocal: scannedAt || new Date().toISOString(),
      concertId,
      gateStaffId: user.id,
    });

    return res.status(200).json({ success: true, data: result });
  }

  @Post('sync')
  async syncOfflineLogs(@CurrentUser() user: AuthUser, @Body() body: any, @Res() res: Response) {
    const { concertId, deviceId, logs } = body;

    if (!concertId || !Array.isArray(logs)) {
      throw new AppError(400, 'BAD_REQUEST', 'Thiếu concertId hoặc logs không phải là mảng.');
    }

    const result = await this.checkinService.syncOfflineLogs({
      concertId,
      deviceId: deviceId || 'OFFLINE_SYNC',
      logs,
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
    @Body() body: any,
    @Res() res: Response
  ) {
    const { deviceId } = body;
    const result = await this.checkinService.checkinVipGuest(id, deviceId || 'MANUAL_CHECKIN', user.id);

    return res.status(200).json({ success: true, data: result });
  }

  @Get('stats/:concertId')
  async getCheckinStats(@CurrentUser() user: AuthUser, @Param('concertId') concertId: string, @Res() res: Response) {
    const result = await this.checkinService.getCheckinStats(concertId, user.id);
    return res.status(200).json({ success: true, data: result });
  }
}
