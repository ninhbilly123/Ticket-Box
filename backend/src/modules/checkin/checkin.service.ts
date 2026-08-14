import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../shared/modules/prisma.service';
import { AppError } from '../../shared/lib/errors';
import { generateVipGuestQrToken, verifyVipGuestQrToken } from '../../shared/lib/crypto';
import { CheckinStatsService } from './checkin-stats.service';

@Injectable()
export class CheckinService {
  private readonly logger = new Logger(CheckinService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly checkinStatsService: CheckinStatsService
  ) {}
  public async listAssignedConcerts(staffId: string) {
    const assignments = await this.prisma.staffAssignment.findMany({
      where: { staffId },
      select: {
        gateId: true,
        concert: {
          select: {
            id: true,
            eventCode: true,
            name: true,
            venue: true,
            startAt: true,
            status: true,
          },
        },
      },
    });

    const concerts = new Map<string, {
      id: string;
      eventCode: string;
      name: string;
      venue: string;
      startAt: Date;
      status: string;
      gateIds: string[];
    }>();

    for (const assignment of assignments) {
      const existing = concerts.get(assignment.concert.id);
      if (existing) {
        if (!existing.gateIds.includes(assignment.gateId)) existing.gateIds.push(assignment.gateId);
      } else {
        concerts.set(assignment.concert.id, {
          ...assignment.concert,
          gateIds: [assignment.gateId],
        });
      }
    }

    return [...concerts.values()].sort((a, b) => a.startAt.getTime() - b.startAt.getTime());
  }

  /**
   * Soát vé trực tuyến (Online scan)
   */
  public async scanTicket(params: {
    ticketId: string;
    deviceId: string;
    scannedAtLocal: string;
    concertId: string;
    gateStaffId: string;
  }) {
    const { ticketId, deviceId, scannedAtLocal, concertId, gateStaffId } = params;
    await this.assertStaffCanScanConcert(gateStaffId, concertId);

    // 1. Kiểm tra vé có tồn tại trong database không (chấp nhận cả UUID id hoặc qrCode thường)
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(ticketId);
    const ticket = await this.prisma.ticket.findFirst({
      where: {
        OR: [
          ...(isUuid ? [{ id: ticketId }] : []),
          { qrCode: ticketId },
        ],
      },
      include: {
        user: true,
        orderItem: {
          include: {
            ticketType: true,
          },
        },
      },
    });

    if (!ticket) {
      return this.scanImportedVipGuest({
        qrToken: ticketId,
        scannedAtLocal,
        concertId,
        deviceId,
      });
    }

    const customer = {
      name: ticket.user.fullName,
      email: ticket.user.email,
      phone: ticket.user.phone || null,
      isVip: false,
    };

    // 2. Kiểm tra vé có thuộc đúng concert đang soát không
    const ticketConcertId = ticket.orderItem.ticketType.concertId;
    if (ticketConcertId !== concertId) {
      return { status: 'WRONG_CONCERT', customer };
    }

    // 3. Kiểm tra ngày diễn ra concert (WRONG_DATE)
    const concert = await this.prisma.concert.findUnique({
      where: { id: concertId },
    });

    if (!concert) {
      return { status: 'WRONG_CONCERT', customer };
    }

    const scannedAt = new Date(scannedAtLocal);
    if (Number.isNaN(scannedAt.getTime())) {
      return { status: 'INVALID_SCAN_TIME', customer };
    }

    const scanDate = scannedAt.toDateString();
    const concertDate = new Date(concert.startAt).toDateString();
    if (scanDate !== concertDate) {
      return { status: 'WRONG_DATE', customer };
    }

    // 4. Kiểm tra vé đã được check-in trước đó chưa
    const existingCheckin = await this.prisma.checkinLog.findFirst({
      where: {
        ticketId: ticket.id,
        synced: true, // Lượt quét thành công đã đồng bộ
      },
    });

    if (existingCheckin) {
      return {
        status: 'ALREADY_USED',
        checkedInAt: existingCheckin.scannedAtLocal,
        deviceId: existingCheckin.deviceId,
        customer,
      };
    }

    // 5. Ghi nhận check-in thành công theo kiểu atomic để chống quét trùng đồng thời.
    const result = await this.prisma.$transaction(async (tx) => {
      const updatedTicket = await tx.ticket.updateMany({
        where: { id: ticket.id, status: 'valid' },
        data: {
          status: 'used',
          usedAt: scannedAt,
        },
      });

      if (updatedTicket.count === 0) {
        return null;
      }

      // Tạo bản ghi log check-in thành công
      const checkinLog = await tx.checkinLog.create({
        data: {
          ticketId: ticket.id,
          gateStaffId,
          deviceId,
          synced: true,
          scannedAtLocal: scannedAt,
          syncedAt: new Date(),
        },
      });

      return {
        status: 'VALID',
        ticket: {
          id: ticket.id,
          seatNumber: ticket.seatNumber || null,
          ticketType: ticket.orderItem.ticketType.name,
          usedAt: checkinLog.scannedAtLocal,
        },
        customer,
      };
    });

    if (result) {
      return result;
    }

    const latestCheckin = await this.prisma.checkinLog.findFirst({
      where: { ticketId: ticket.id, synced: true },
      orderBy: { scannedAtLocal: 'asc' },
    });

    if (latestCheckin) {
      return {
        status: 'ALREADY_USED',
        checkedInAt: latestCheckin.scannedAtLocal,
        deviceId: latestCheckin.deviceId,
        customer,
      };
    }

    const latestTicket = await this.prisma.ticket.findUnique({ where: { id: ticket.id } });
    return {
      status: latestTicket?.status === 'cancelled' ? 'CANCELLED' : 'INVALID_TICKET',
      customer,
    };
  }

  private async scanImportedVipGuest(params: {
    qrToken: string;
    scannedAtLocal: string;
    concertId: string;
    deviceId: string;
  }) {
    const { qrToken, scannedAtLocal, concertId, deviceId } = params;
    const guest = await this.prisma.vipGuest.findUnique({
      where: { qrToken },
      include: { concert: true },
    });

    if (!guest || !guest.qrToken || !verifyVipGuestQrToken(guest.id, guest.qrToken)) {
      return { status: 'INVALID_TICKET' };
    }

    const customer = {
      name: guest.fullName,
      email: guest.email || null,
      phone: guest.phone || null,
      company: guest.company || null,
      isVip: true,
    };

    if (guest.concertId !== concertId) {
      return { status: 'WRONG_CONCERT', customer };
    }

    const scannedAt = new Date(scannedAtLocal);
    if (Number.isNaN(scannedAt.getTime())) {
      return { status: 'INVALID_SCAN_TIME', customer };
    }
    if (scannedAt.toDateString() !== guest.concert.startAt.toDateString()) {
      return { status: 'WRONG_DATE', customer };
    }
    if (guest.ticketStatus === 'CANCELLED') {
      return { status: 'CANCELLED', customer };
    }
    if (guest.ticketStatus === 'USED') {
      return {
        status: 'ALREADY_USED',
        checkedInAt: guest.checkedInAt,
        deviceId: null,
        customer,
      };
    }

    const updated = await this.prisma.vipGuest.updateMany({
      where: { id: guest.id, ticketStatus: 'VALID' },
      data: { ticketStatus: 'USED', checkedInAt: scannedAt },
    });
    if (updated.count === 0) {
      const latest = await this.prisma.vipGuest.findUnique({ where: { id: guest.id } });
      return {
        status: latest?.ticketStatus === 'CANCELLED' ? 'CANCELLED' : 'ALREADY_USED',
        checkedInAt: latest?.checkedInAt || null,
        deviceId: null,
        customer,
      };
    }

    return {
      status: 'VALID',
      ticket: {
        id: guest.id,
        seatNumber: null,
        ticketType: guest.zone,
        usedAt: scannedAt,
        deviceId,
        guestType: 'VIP_GUEST',
      },
      customer,
    };
  }

  /**
   * Đồng bộ dữ liệu offline từ client lên
   */
  /**
   * Dong bo du lieu offline tu client len.
   * Dung chung scanTicket de ho tro ca ve thuong va QR khach VIP.
   */
  public async syncOfflineLogs(params: {
    concertId: string;
    deviceId: string;
    logs: Array<{ ticketId: string; scannedAtLocal: string }>;
    gateStaffId: string;
  }) {
    const { concertId, deviceId, logs, gateStaffId } = params;

    const sortedLogs = [...logs].sort(
      (a, b) => new Date(a.scannedAtLocal).getTime() - new Date(b.scannedAtLocal).getTime()
    );

    let syncedCount = 0;
    let conflictCount = 0;
    const conflicts: Array<{ ticketId: string; scannedAtLocal: string; reason: string; customer?: unknown }> = [];

    for (const log of sortedLogs) {
      try {
        const result = await this.scanTicket({
          ticketId: log.ticketId,
          deviceId,
          scannedAtLocal: log.scannedAtLocal,
          concertId,
          gateStaffId,
        });

        if (result.status === 'VALID') {
          syncedCount++;
        } else {
          conflicts.push({
            ticketId: log.ticketId,
            scannedAtLocal: log.scannedAtLocal,
            reason: result.status,
            customer: 'customer' in result ? result.customer : null,
          });
          conflictCount++;
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        this.logger.error(`[Checkin Service] Error syncing log for ticket ${log.ticketId}.`, err instanceof Error ? err.stack : message);
        conflicts.push({
          ticketId: log.ticketId,
          scannedAtLocal: log.scannedAtLocal,
          reason: `Loi he thong: ${message}`,
        });
        conflictCount++;
      }
    }

    return {
      syncedCount,
      conflictCount,
      conflicts,
    };
  }


  /**
   * Tìm kiếm danh sách khách VIP kèm trạng thái vé của họ
   */
  public async getVipGuests(concertId: string, query: string, gateStaffId: string) {
    await this.assertStaffCanScanConcert(gateStaffId, concertId);
    // 1. Tìm các khách VIP trong bảng vip_guests
    const vipGuests = await this.prisma.vipGuest.findMany({
      where: {
        concertId,
        ...(query
          ? {
              OR: [
                { fullName: { contains: query, mode: 'insensitive' as const } },
                { identifier: { contains: query, mode: 'insensitive' as const } },
                { email: { contains: query, mode: 'insensitive' as const } },
                { phone: { contains: query, mode: 'insensitive' as const } },
              ],
            }
          : {}),
      },
    });

    const result = [];

    for (const guest of vipGuests) {
      if (guest.qrToken) {
        result.push({
          id: guest.id,
          fullName: guest.fullName,
          identifier: guest.identifier,
          email: guest.email,
          phone: guest.phone,
          company: guest.company,
          zone: guest.zone,
          ticketDetails: {
            ticketId: guest.qrToken,
            ticketType: guest.zone,
            status: guest.ticketStatus,
            checkedIn: guest.ticketStatus === 'USED',
            checkedInAt: guest.checkedInAt,
          },
        });
        continue;
      }

      // 2. Tìm User có email hoặc phone khớp với identifier
      const contacts = [guest.email, guest.phone, guest.identifier].filter(
        (value): value is string => Boolean(value)
      );
      const user = contacts.length
        ? await this.prisma.user.findFirst({
            where: {
              OR: contacts.flatMap((contact) => [{ email: contact }, { phone: contact }]),
            },
          })
        : null;

      let ticket = null;
      let checkinLog = null;

      if (user) {
        // 3. Tìm vé của User thuộc Concert này
        ticket = await this.prisma.ticket.findFirst({
          where: {
            userId: user.id,
            orderItem: {
              order: {
                concertId,
              },
            },
          },
          include: {
            orderItem: {
              include: {
                ticketType: true,
              },
            },
          },
        });

        if (ticket) {
          checkinLog = await this.prisma.checkinLog.findFirst({
            where: {
              ticketId: ticket.id,
              synced: true,
            },
          });
        }
      }

      result.push({
        id: guest.id,
        fullName: guest.fullName,
        identifier: guest.identifier,
        zone: guest.zone,
        ticketDetails: ticket
          ? {
              ticketId: ticket.id,
              ticketType: ticket.orderItem.ticketType.name,
              status: ticket.status,
              checkedIn: checkinLog ? true : false,
              checkedInAt: checkinLog ? checkinLog.scannedAtLocal : null,
            }
          : null, // Chưa phát hành vé
      });
    }

    return result;
  }

  /**
   * Soát vé trực tiếp cho khách VIP bằng cách kích hoạt vé của họ
   */
  public async checkinVipGuest(vipGuestId: string, deviceId: string, gateStaffId: string) {
    const guest = await this.prisma.vipGuest.findUnique({
      where: { id: vipGuestId },
    });

    if (!guest) {
      throw new AppError(404, 'NOT_FOUND', 'Không tìm thấy thông tin khách VIP.');
    }

    await this.assertStaffCanScanConcert(gateStaffId, guest.concertId);

    if (guest.qrToken) {
      return this.scanImportedVipGuest({
        qrToken: guest.qrToken,
        deviceId,
        scannedAtLocal: new Date().toISOString(),
        concertId: guest.concertId,
      });
    }

    const qrToken = generateVipGuestQrToken(guest.id);
    await this.prisma.vipGuest.update({
      where: { id: guest.id },
      data: { qrToken },
    });

    return this.scanImportedVipGuest({
      qrToken,
      deviceId,
      scannedAtLocal: new Date().toISOString(),
      concertId: guest.concertId,
    });
  }

  /**
   * Lấy số liệu thống kê check-in thời gian thực cho Ban tổ chức
   */
  public async getCheckinStats(concertId: string, gateStaffId: string) {
    await this.assertStaffCanScanConcert(gateStaffId, concertId);
    return this.checkinStatsService.getStats(concertId);
  }

  private async assertStaffCanScanConcert(staffId: string, concertId: string) {
    if (!concertId) {
      throw new AppError(400, 'BAD_REQUEST', 'Thiếu concertId.');
    }

    const assignment = await this.prisma.staffAssignment.findFirst({
      where: { staffId, concertId },
      select: { id: true },
    });

    if (!assignment) {
      throw new AppError(403, 'FORBIDDEN_RESOURCE', 'Bạn không được phân công soát vé cho concert này.');
    }
  }
}
export default CheckinService;
