import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../shared/modules/prisma.service';
import { AppError } from '../../shared/lib/errors';

@Injectable()
export class TicketService {
  constructor(private readonly prisma: PrismaService) {}

  public async bookTickets(_params: {
    userId: string;
    concertId: string;
    ticketTypeId: string;
    quantity: number;
  }) {
    throw new AppError(410, 'LEGACY_BOOKING_DISABLED', 'Luồng đặt vé cũ đã bị vô hiệu hóa. Vui lòng dùng /api/v1/orders/hold.');
  }

  public async getOrderById(orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        orderItems: {
          include: {
            tickets: true,
          },
        },
      },
    });
    if (!order) {
      throw new AppError(404, 'ORDER_NOT_FOUND', 'Không tìm thấy đơn hàng.');
    }

    const flatTickets = order.orderItems.flatMap((item) =>
      item.tickets.map((ticket) => ({
        ...ticket,
        seatNumber: ticket.seatNumber || null,
      }))
    );

    return {
      order,
      tickets: flatTickets,
    };
  }

  public async getHistory(userId: string) {
    const orders = await this.prisma.order.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        concert: true,
        orderItems: {
          include: {
            ticketType: true,
            tickets: true,
          },
        },
        payments: true,
      },
    });

    return orders.map((order) => {
      const tickets = order.orderItems.flatMap((item) =>
        item.tickets.map((ticket) => ({
          id: ticket.id,
          qrCode: ticket.qrCode,
          status: ticket.status,
          seatNumber: ticket.seatNumber || null,
          ticketType: item.ticketType.name,
          price: item.unitPrice,
        }))
      );

      return {
        orderId: order.id,
        concertName: order.concert.name,
        concertVenue: order.concert.venue,
        concertStartAt: order.concert.startAt,
        totalAmount: order.totalAmount,
        status: order.status,
        createdAt: order.createdAt,
        payments: order.payments,
        tickets,
      };
    });
  }
}
