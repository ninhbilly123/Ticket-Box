import { prisma } from '../../shared/lib/prisma';
import redisClient from '../../shared/lib/redis';
import { AppError } from '../../shared/lib/errors';
import { verifyQrToken } from '../../shared/lib/crypto';

export class TicketService {
  /**
   * Book tickets with transaction, per-user limit checking, pessimistic locks, and cache invalidation
   */
  public async bookTickets(params: {
    userId: string;
    concertId: string;
    ticketTypeId: string;
    quantity: number;
  }) {
    const { userId, concertId, ticketTypeId, quantity } = params;

    if (quantity <= 0) {
      throw new AppError(400, 'INVALID_QUANTITY', 'Số lượng vé đặt mua phải lớn hơn 0.');
    }

    // Wrap in interactive transaction
    return await prisma.$transaction(async (tx) => {
      // 1. Acquire pessimistic lock on the TicketType record to prevent concurrent updates on the inventory
      const ticketTypes: any[] = await tx.$queryRaw`
        SELECT id, price, total_quantity as "totalQuantity", max_limit_per_user as "maxLimitPerUser"
        FROM ticket_types 
        WHERE id = ${ticketTypeId} 
        LIMIT 1 
        FOR UPDATE
      `;

      if (ticketTypes.length === 0) {
        throw new AppError(404, 'TICKET_TYPE_NOT_FOUND', 'Không tìm thấy loại vé yêu cầu.');
      }

      const ticketType = ticketTypes[0];

      // 2. Check per-user purchase limit
      // Count tickets already bought successfully (order status = PAID) by this user
      const alreadyBought = await tx.ticket.count({
        where: {
          ticketTypeId,
          order: {
            userId,
            status: 'PAID',
          },
        },
      });

      if (alreadyBought + quantity > ticketType.maxLimitPerUser) {
        throw new AppError(
          400,
          'LIMIT_EXCEEDED',
          `Bạn đã mua ${alreadyBought} vé của phân hạng này. Giới hạn tối đa là ${ticketType.maxLimitPerUser} vé. Bạn chỉ được mua thêm tối đa ${Math.max(0, ticketType.maxLimitPerUser - alreadyBought)} vé.`
        );
      }

      // 3. Check inventory
      // Count tickets currently locked (RESERVED) or purchased (BOOKED)
      const soldCount = await tx.ticket.count({
        where: {
          ticketTypeId,
          status: {
            in: ['RESERVED', 'BOOKED'],
          },
        },
      });

      const remaining = Math.max(0, ticketType.totalQuantity - soldCount);

      if (remaining < quantity) {
        throw new AppError(
          400,
          'OUT_OF_STOCK',
          `Hạng vé này không đủ số lượng yêu cầu. Còn lại: ${remaining} vé.`
        );
      }

      // 4. Create the Order
      const totalAmount = Number(ticketType.price) * quantity;
      const order = await tx.order.create({
        data: {
          userId,
          concertId,
          totalAmount,
          status: 'PENDING',
        },
      });

      // 5. Create the Ticket records (RESERVED state representing locked seats)
      const ticketData = Array.from({ length: quantity }).map((_, index) => ({
        orderId: order.id,
        ticketTypeId,
        seatNumber: `SEAT-${Math.floor(100 + Math.random() * 900)}`, // Dummy seat number
        status: 'RESERVED' as const,
      }));

      await tx.ticket.createMany({
        data: ticketData,
      });

      const tickets = await tx.ticket.findMany({
        where: { orderId: order.id },
      });

      // 6. Invalidate Redis Cache (asynchronous/non-blocking delete)
      const cacheKey = `ticket_inventory:${ticketTypeId}`;
      try {
        if (redisClient.isOpen) {
          await redisClient.del(cacheKey);
        }
      } catch (err) {
        console.error(`[Redis Cache Invalidation Error] Failed to delete key ${cacheKey}:`, err);
      }

      // 7. Lock tickets in Redis
      const { lockTicket } = require('../../shared/lib/redis');
      for (const t of tickets) {
        await lockTicket(t.id, order.id, 600);
      }

      // 8. Schedule Timeout Job
      const { reservationQueue } = require('../../workers/reservation.worker');
      await reservationQueue.add('timeout', { orderId: order.id }, { delay: 600000 });

      const expiredAt = new Date(Date.now() + 600 * 1000);

      return {
        order,
        tickets,
        expiredAt
      };
    });
  }

  /**
   * Retrieve order details by ID
   */
  public async getOrderById(orderId: string) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { tickets: true },
    });
    if (!order) {
      throw new AppError(404, 'ORDER_NOT_FOUND', 'Không tìm thấy đơn hàng.');
    }
    return order;
  }

  /**
   * Scan and validate a ticket using its QR token
   */
  public async scanTicket(qrToken: string) {
    if (!qrToken) {
      throw new AppError(400, 'BAD_REQUEST', 'Vui lòng cung cấp mã QR (qrToken).');
    }

    const ticket = await prisma.ticket.findUnique({
      where: { qrToken },
      include: { order: true, ticketType: true }
    });

    if (!ticket) {
      throw new AppError(404, 'INVALID_TICKET', 'Vé không hợp lệ hoặc không tồn tại trong hệ thống.');
    }

    if (!verifyQrToken(ticket.id, qrToken)) {
      throw new AppError(400, 'INVALID_TICKET', 'Mã QR không hợp lệ hoặc đã bị làm giả.');
    }

    if (ticket.status !== 'BOOKED') {
      throw new AppError(400, 'INVALID_STATUS', 'Vé chưa được thanh toán thành công hoặc đã bị hủy.');
    }

    if (ticket.isCheckedIn) {
      throw new AppError(400, 'ALREADY_CHECKED_IN', 'Vé này đã được sử dụng (check-in) trước đó.');
    }

    // Update ticket
    const updatedTicket = await prisma.ticket.update({
      where: { id: ticket.id },
      data: { isCheckedIn: true }
    });

    return {
      id: updatedTicket.id,
      seatNumber: updatedTicket.seatNumber,
      ticketType: ticket.ticketType.name,
      checkedInAt: new Date(),
    };
  }
}
