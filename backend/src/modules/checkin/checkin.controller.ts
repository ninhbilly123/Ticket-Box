import { Request, Response, NextFunction } from 'express';
import { CheckinService } from './checkin.service';
import { prisma } from '../../shared/lib/prisma';

const checkinService = new CheckinService();

export class CheckinController {
  // Staff ID mặc định lấy từ seed để dự phòng khi chưa tích hợp xong JWT Auth của Thành viên A
  private defaultStaffId = '7abe2001-f718-462d-b76a-18507d442df7';

  private async resolveStaffId(gateStaffId?: string, xStaffId?: string | string[]): Promise<string> {
    const targetId = (gateStaffId || xStaffId || this.defaultStaffId) as string;
    
    // Kiểm tra định dạng UUID hợp lệ trước khi truy vấn để tránh crash
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(targetId);
    if (isUuid) {
      const exists = await prisma.user.findFirst({
        where: { id: targetId, role: { in: ['CHECKIN_STAFF', 'gate_staff'] } },
      });
      if (exists) {
        return targetId;
      }
    }
    
    const firstStaff = await prisma.user.findFirst({
      where: { role: { in: ['CHECKIN_STAFF', 'gate_staff'] } },
    });
    if (firstStaff) {
      return firstStaff.id;
    }
    return targetId;
  }

  /**
   * Quét soát vé trực tiếp (Online Scan)
   */
  public async scanTicket(req: Request, res: Response, next: NextFunction) {
    try {
      const { ticketId, deviceId, scannedAtLocal, concertId, gateStaffId } = req.body;

      if (!ticketId || !deviceId || !scannedAtLocal || !concertId) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'BAD_REQUEST',
            message: 'Thiếu thông tin bắt buộc: ticketId, deviceId, scannedAtLocal, concertId.',
          },
        });
      }

      // Đọc staff ID từ request body, headers hoặc dùng default (tự động phân giải ID hợp lệ)
      const staffId = await this.resolveStaffId(gateStaffId, req.headers['x-staff-id']);

      const result = await checkinService.scanTicket({
        ticketId: String(ticketId),
        deviceId: String(deviceId),
        scannedAtLocal: String(scannedAtLocal),
        concertId: String(concertId),
        gateStaffId: String(staffId),
      });

      return res.status(200).json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Đồng bộ lịch sử quét offline (Offline Sync)
   */
  public async syncOfflineLogs(req: Request, res: Response, next: NextFunction) {
    try {
      const { deviceId, logs, gateStaffId } = req.body;

      if (!deviceId || !Array.isArray(logs)) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'BAD_REQUEST',
            message: 'Thông tin gửi lên không đúng định dạng. Cần deviceId và logs (mảng).',
          },
        });
      }

      const staffId = await this.resolveStaffId(gateStaffId, req.headers['x-staff-id']);

      const result = await checkinService.syncOfflineLogs({
        deviceId: String(deviceId),
        logs,
        gateStaffId: String(staffId),
      });

      return res.status(200).json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Tra cứu danh sách khách VIP
   */
  public async getVipGuests(req: Request, res: Response, next: NextFunction) {
    try {
      const { concertId, query } = req.query;

      if (!concertId) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'BAD_REQUEST',
            message: 'Thiếu concertId trong query parameter.',
          },
        });
      }

      const result = await checkinService.getVipGuests(String(concertId), String(query || ''));

      return res.status(200).json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Check-in trực tiếp cho khách VIP
   */
  public async checkinVipGuest(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params; // vipGuestId
      const { deviceId, gateStaffId } = req.body;

      if (!deviceId) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'BAD_REQUEST',
            message: 'Thiếu deviceId trong request body.',
          },
        });
      }

      const staffId = await this.resolveStaffId(gateStaffId, req.headers['x-staff-id']);

      const result = await checkinService.checkinVipGuest(
        id,
        String(deviceId),
        String(staffId)
      );

      return res.status(200).json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Lấy số liệu thống kê check-in thời gian thực
   */
  public async getCheckinStats(req: Request, res: Response, next: NextFunction) {
    try {
      const { concertId } = req.params;

      if (!concertId) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'BAD_REQUEST',
            message: 'Thiếu concertId trong path parameter.',
          },
        });
      }

      const stats = await checkinService.getCheckinStats(concertId);

      return res.status(200).json({
        success: true,
        data: stats,
      });
    } catch (err) {
      next(err);
    }
  }
}
export default CheckinController;
