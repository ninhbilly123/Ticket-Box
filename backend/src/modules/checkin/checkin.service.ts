import { prisma } from '../../shared/lib/prisma';
import { AppError } from '../../shared/lib/errors';
import { publishToQueue } from '../../shared/lib/rabbitmq';

export class CheckinService {
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
        orderItem: {
          include: {
            ticketType: true,
          },
        },
      },
    });

    if (!ticket) {
      return { status: 'INVALID_TICKET' };
    }

    // 2. Kiểm tra vé có thuộc đúng concert đang soát không
    const ticketConcertId = ticket.orderItem.ticketType.concertId;
    if (ticketConcertId !== concertId) {
      return { status: 'WRONG_CONCERT' };
    }

    // 3. Kiểm tra ngày diễn ra concert (WRONG_DATE)
    const concert = await prisma.concert.findUnique({
      where: { id: concertId },
    });

    if (!concert) {
      return { status: 'WRONG_CONCERT' };
    }

    const scanDate = new Date(scannedAtLocal).toDateString();
    const concertDate = new Date(concert.startAt).toDateString();
    if (scanDate !== concertDate) {
      return { status: 'WRONG_DATE' };
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
      };
    }

    // 5. Ghi nhận check-in thành công
    return await prisma.$transaction(async (tx) => {
      // Tạo bản ghi log check-in thành công
      const checkinLog = await tx.checkinLog.create({
        data: {
          ticketId: ticket.id,
          gateStaffId,
          deviceId,
          synced: true,
          scannedAtLocal: new Date(scannedAtLocal),
          syncedAt: new Date(),
        },
      });

      // Cập nhật trạng thái vé thành 'used'
      await tx.ticket.update({
        where: { id: ticket.id },
        data: {
          status: 'used',
          usedAt: new Date(scannedAtLocal),
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
      };
    });
  }

  /**
   * Đồng bộ dữ liệu offline từ client lên
   */
  public async syncOfflineLogs(params: {
    deviceId: string;
    logs: Array<{ ticketId: string; scannedAtLocal: string }>;
    gateStaffId: string;
  }) {
    const { deviceId, logs, gateStaffId } = params;

    // Sắp xếp các lượt quét theo thời gian tăng dần (First-Scan Wins)
    const sortedLogs = [...logs].sort(
      (a, b) => new Date(a.scannedAtLocal).getTime() - new Date(b.scannedAtLocal).getTime()
    );

    let syncedCount = 0;
    let conflictCount = 0;
    const conflicts: Array<{ ticketId: string; scannedAtLocal: string; reason: string }> = [];

    for (const log of sortedLogs) {
      try {
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(log.ticketId);
        const ticket = await prisma.ticket.findFirst({
          where: {
            OR: [
              ...(isUuid ? [{ id: log.ticketId }] : []),
              { qrCode: log.ticketId },
            ],
          },
          include: {
            orderItem: {
              include: {
                ticketType: true,
              },
            },
          },
        });

        if (!ticket) {
          conflicts.push({
            ticketId: log.ticketId,
            scannedAtLocal: log.scannedAtLocal,
            reason: 'Vé không tồn tại trong hệ thống (INVALID_TICKET)',
          });
          conflictCount++;
          continue;
        }

        // Kiểm tra xem đã có log thành công nào của vé này trong database chưa
        const alreadyCheckedIn = await prisma.checkinLog.findFirst({
          where: {
            ticketId: ticket.id,
            synced: true,
          },
        });

        if (alreadyCheckedIn) {
          // Tranh chấp xảy ra! Lưu vết log offline bị trùng làm bằng chứng
          await prisma.checkinLog.create({
            data: {
              ticketId: ticket.id,
              gateStaffId,
              deviceId,
              synced: false, // synced = false đánh dấu tranh chấp/lỗi
              scannedAtLocal: new Date(log.scannedAtLocal),
              syncedAt: null, // Chưa và không bao giờ sync thành công
            },
          });

          conflicts.push({
            ticketId: log.ticketId,
            scannedAtLocal: log.scannedAtLocal,
            reason: `Vé đã được quét trước đó vào lúc ${alreadyCheckedIn.scannedAtLocal.toISOString()} bởi thiết bị ${alreadyCheckedIn.deviceId}`,
          });
          conflictCount++;
        } else {
          // Chưa có ai quét: Ghi nhận checkin thành công
          await prisma.$transaction(async (tx) => {
            await tx.checkinLog.create({
              data: {
                ticketId: ticket.id,
                gateStaffId,
                deviceId,
                synced: true,
                scannedAtLocal: new Date(log.scannedAtLocal),
                syncedAt: new Date(),
              },
            });

            await tx.ticket.update({
              where: { id: ticket.id },
              data: {
                status: 'used',
                usedAt: new Date(log.scannedAtLocal),
              },
            });
          });

          syncedCount++;
        }
      } catch (err: any) {
        console.error(`[Checkin Service] Error syncing log for ticket ${log.ticketId}:`, err);
        conflicts.push({
          ticketId: log.ticketId,
          scannedAtLocal: log.scannedAtLocal,
          reason: `Lỗi hệ thống: ${err.message}`,
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
        OR: [
          { fullName: { contains: query, mode: 'insensitive' } },
          { identifier: { contains: query, mode: 'insensitive' } },
        ],
      },
    });

    const result = [];

    for (const guest of vipGuests) {
      // 2. Tìm User có email hoặc phone khớp với identifier
      const user = await prisma.user.findFirst({
        where: {
          OR: [
            { email: guest.identifier },
            { phone: guest.identifier },
          ],
        },
      });

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

    // Tìm user và vé tương ứng
    let user = await prisma.user.findFirst({
      where: {
        OR: [{ email: guest.identifier }, { phone: guest.identifier }],
      },
    });

    // Nếu chưa có user (khách VIP chưa tạo tài khoản), tự động tạo tài khoản phụ cho họ
    if (!user) {
      user = await prisma.user.create({
        data: {
          email: guest.identifier.includes('@') ? guest.identifier : `${guest.id}@vip.ticketbox.com`,
          passwordHash: 'AUTO_GENERATED',
          fullName: guest.fullName,
          phone: !guest.identifier.includes('@') ? guest.identifier : null,
          role: 'AUDIENCE',
        },
      });
    }

    // Tìm vé
    let ticket = await prisma.ticket.findFirst({
      where: {
        userId: user.id,
        orderItem: {
          order: {
            concertId: guest.concertId,
          },
        },
      },
    });

    // Nếu khách VIP có trong danh sách nhưng chưa được phát hành vé, tự động phát hành 1 vé VIP
    if (!ticket) {
      // Tìm ticket type khớp với hạng ghế (zone) của khách VIP
      let vipType = await prisma.ticketType.findFirst({
        where: {
          concertId: guest.concertId,
          name: { equals: guest.zone, mode: 'insensitive' },
        },
      });

      // Nếu không tìm thấy hạng vé khớp chính xác với zone, tìm VIP/SVIP/GUEST_LIST làm dự phòng
      if (!vipType) {
        vipType = await prisma.ticketType.findFirst({
          where: {
            concertId: guest.concertId,
            name: { in: ['VIP', 'SVIP', 'GUEST_LIST'] },
          },
        });
      }

      // Nếu vẫn không tìm thấy, lấy ticket type đầu tiên có sẵn
      if (!vipType) {
        vipType = await prisma.ticketType.findFirst({
          where: { concertId: guest.concertId },
        });
      }

      if (!vipType) {
        throw new AppError(400, 'BAD_REQUEST', 'Concert này chưa được cấu hình hạng vé nào.');
      }

      ticket = await prisma.$transaction(async (tx) => {
        const order = await tx.order.create({
          data: {
            userId: user!.id,
            concertId: guest.concertId,
            status: 'paid',
            totalAmount: 0,
            idempotencyKey: `vip-auto-gen-${guest.id}`,
          },
        });

        const orderItem = await tx.orderItem.create({
          data: {
            orderId: order.id,
            ticketTypeId: vipType!.id,
            quantity: 1,
            unitPrice: 0,
          },
        });

        return await tx.ticket.create({
          data: {
            orderItemId: orderItem.id,
            userId: user!.id,
            qrCode: `vip-qr-${guest.id}`,
            status: 'valid',
          },
        });
      });

      // Sau khi tạo vé VIP thành công, đẩy tin nhắn xác nhận mua vé (VIP 0đ) vào RabbitMQ
      await publishToQueue('ticketbox_notifications', {
        type: 'purchase_confirm',
        payload: {
          userId: user.id,
          concertId: guest.concertId,
          ticketId: ticket!.id,
        },
      });
    }

    // Tiến hành soát vé
    return await this.scanTicket({
      ticketId: ticket.id,
      deviceId,
      scannedAtLocal: new Date().toISOString(),
      concertId: guest.concertId,
      gateStaffId,
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
