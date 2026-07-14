import { prisma } from '../../shared/lib/prisma';
import { AppError } from '../../shared/lib/errors';
import { generateVipGuestQrToken, verifyVipGuestQrToken } from '../../shared/lib/crypto';

export class CheckinService {
  public async listAssignedConcerts(staffId: string) {
    const assignments = await prisma.staffAssignment.findMany({
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

    // 1. Kiểm tra vé có tồn tại trong database không (chấp nhận cả UUID id hoặc qrCode thường)
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(ticketId);
    const ticket = await prisma.ticket.findFirst({
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
    const concert = await prisma.concert.findUnique({
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
    const existingCheckin = await prisma.checkinLog.findFirst({
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
    const result = await prisma.$transaction(async (tx) => {
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
          seatNumber: (ticket as any).seatNumber || null,
          ticketType: ticket.orderItem.ticketType.name,
          usedAt: checkinLog.scannedAtLocal,
        },
        customer,
      };
    });

    if (result) {
      return result;
    }

    const latestCheckin = await prisma.checkinLog.findFirst({
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

    const latestTicket = await prisma.ticket.findUnique({ where: { id: ticket.id } });
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
    const guest = await prisma.vipGuest.findUnique({
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

    const updated = await prisma.vipGuest.updateMany({
      where: { id: guest.id, ticketStatus: 'VALID' },
      data: { ticketStatus: 'USED', checkedInAt: scannedAt },
    });
    if (updated.count === 0) {
      const latest = await prisma.vipGuest.findUnique({ where: { id: guest.id } });
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
    const conflicts: Array<{ ticketId: string; scannedAtLocal: string; reason: string; customer?: any }> = [];

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
            customer: (result as any).customer || null,
          });
          conflictCount++;
        }
      } catch (err: any) {
        console.error(`[Checkin Service] Error syncing log for ticket ${log.ticketId}:`, err);
        conflicts.push({
          ticketId: log.ticketId,
          scannedAtLocal: log.scannedAtLocal,
          reason: `Loi he thong: ${err.message}`,
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
  public async getVipGuests(concertId: string, query: string) {
    // 1. Tìm các khách VIP trong bảng vip_guests
    const vipGuests = await prisma.vipGuest.findMany({
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
        ? await prisma.user.findFirst({
            where: {
              OR: contacts.flatMap((contact) => [{ email: contact }, { phone: contact }]),
            },
          })
        : null;

      let ticket = null;
      let checkinLog = null;

      if (user) {
        // 3. Tìm vé của User thuộc Concert này
        ticket = await prisma.ticket.findFirst({
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
          checkinLog = await prisma.checkinLog.findFirst({
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
    const guest = await prisma.vipGuest.findUnique({
      where: { id: vipGuestId },
    });

    if (!guest) {
      throw new AppError(404, 'NOT_FOUND', 'Không tìm thấy thông tin khách VIP.');
    }

    if (guest.qrToken) {
      return this.scanImportedVipGuest({
        qrToken: guest.qrToken,
        deviceId,
        scannedAtLocal: new Date().toISOString(),
        concertId: guest.concertId,
      });
    }

    const qrToken = generateVipGuestQrToken(guest.id);
    await prisma.vipGuest.update({
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
  public async getCheckinStats(concertId: string) {
    const ticketTypes = await prisma.ticketType.findMany({
      where: { concertId },
    });

    const breakdown: Record<string, { total: number; checkedIn: number; percent: number }> = {};
    let grandTotal = 0;
    let grandCheckedIn = 0;

    for (const tt of ticketTypes) {
      // Đếm tổng số vé đã phát hành bán thành công của hạng này
      const total = await prisma.ticket.count({
        where: {
          orderItem: {
            ticketTypeId: tt.id,
            order: {
              status: 'paid',
            },
          },
        },
      });

      // Đếm số vé đã được quét soát thành công
      const checkedIn = await prisma.ticket.count({
        where: {
          orderItem: {
            ticketTypeId: tt.id,
            order: {
              status: 'paid',
            },
          },
          status: 'used',
        },
      });

      const percent = total > 0 ? Number(((checkedIn / total) * 100).toFixed(1)) : 0;

      breakdown[tt.name] = {
        total,
        checkedIn,
        percent,
      };

      grandTotal += total;
      grandCheckedIn += checkedIn;
    }

    return {
      totalTickets: grandTotal,
      checkedInTickets: grandCheckedIn,
      percent: grandTotal > 0 ? Number(((grandCheckedIn / grandTotal) * 100).toFixed(1)) : 0,
      byTicketType: breakdown,
    };
  }
}
export default CheckinService;
