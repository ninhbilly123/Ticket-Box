import { NextFunction, Request, Response } from 'express';
import { CheckinService } from './checkin.service';
import { authorizationService } from '../rbac/authorization.service';
import { prisma } from '../../shared/lib/prisma';
import { AppError } from '../../shared/lib/errors';

const checkinService = new CheckinService();

export class CheckinController {
  private async assertAssigned(req: Request, concertId: string) {
    const allowed = await authorizationService.canScanConcert(req.user!, concertId);
    if (!allowed) {
      throw new AppError(403, 'FORBIDDEN_RESOURCE', 'Bạn chưa được phân công soát vé cho concert này.');
    }
  }

  public async listAssignedConcerts(req: Request, res: Response, next: NextFunction) {
    try {
      const concerts = await checkinService.listAssignedConcerts(req.user!.id);
      return res.status(200).json({ success: true, data: concerts });
    } catch (error) {
      return next(error);
    }
  }

  public async scanTicket(req: Request, res: Response, next: NextFunction) {
    try {
      const { ticketId, deviceId, scannedAtLocal, concertId } = req.body;
      if (!ticketId || !deviceId || !scannedAtLocal || !concertId) {
        throw new AppError(400, 'BAD_REQUEST', 'Thiếu ticketId, deviceId, scannedAtLocal hoặc concertId.');
      }

      await this.assertAssigned(req, String(concertId));
      const result = await checkinService.scanTicket({
        ticketId: String(ticketId),
        deviceId: String(deviceId),
        scannedAtLocal: String(scannedAtLocal),
        concertId: String(concertId),
        gateStaffId: req.user!.id,
      });
      return res.status(200).json({ success: true, data: result });
    } catch (error) {
      return next(error);
    }
  }

  public async syncOfflineLogs(req: Request, res: Response, next: NextFunction) {
    try {
      const { concertId, deviceId, logs } = req.body;
      if (!concertId || !deviceId || !Array.isArray(logs)) {
        throw new AppError(400, 'BAD_REQUEST', 'Cần concertId, deviceId và logs dạng mảng.');
      }

      await this.assertAssigned(req, String(concertId));
      const result = await checkinService.syncOfflineLogs({
        concertId: String(concertId),
        deviceId: String(deviceId),
        logs,
        gateStaffId: req.user!.id,
      });
      return res.status(200).json({ success: true, data: result });
    } catch (error) {
      return next(error);
    }
  }

  public async getVipGuests(req: Request, res: Response, next: NextFunction) {
    try {
      const concertId = String(req.query.concertId || '');
      if (!concertId) {
        throw new AppError(400, 'BAD_REQUEST', 'Thiếu concertId trong query parameter.');
      }

      await this.assertAssigned(req, concertId);
      const result = await checkinService.getVipGuests(concertId, String(req.query.query || ''));
      return res.status(200).json({ success: true, data: result });
    } catch (error) {
      return next(error);
    }
  }

  public async checkinVipGuest(req: Request, res: Response, next: NextFunction) {
    try {
      const { deviceId } = req.body;
      if (!deviceId) {
        throw new AppError(400, 'BAD_REQUEST', 'Thiếu deviceId trong request body.');
      }

      const guest = await prisma.vipGuest.findUnique({
        where: { id: req.params.id },
        select: { concertId: true },
      });
      if (!guest) {
        throw new AppError(404, 'NOT_FOUND', 'Không tìm thấy khách VIP.');
      }

      await this.assertAssigned(req, guest.concertId);
      const result = await checkinService.checkinVipGuest(req.params.id, String(deviceId), req.user!.id);
      return res.status(200).json({ success: true, data: result });
    } catch (error) {
      return next(error);
    }
  }

  public async getCheckinStats(req: Request, res: Response, next: NextFunction) {
    try {
      const { concertId } = req.params;
      if (!concertId) {
        throw new AppError(400, 'BAD_REQUEST', 'Thiếu concertId trong path parameter.');
      }

      await this.assertAssigned(req, concertId);
      const stats = await checkinService.getCheckinStats(concertId);
      return res.status(200).json({ success: true, data: stats });
    } catch (error) {
      return next(error);
    }
  }
}

export default CheckinController;
