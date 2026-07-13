import { prisma } from '../../shared/lib/prisma';
import redisClient, { isRedisReady, runRedisOperation } from '../../shared/lib/redis';
import { AppError } from '../../shared/lib/errors';

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
        SELECT id, price, total_quantity as "totalQuantity", max_per_account as "maxLimitPerUser"
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
          orderItem: {
            ticketTypeId,
            order: {
              userId,
              status: { in: ['paid', 'PAID'] },
            },
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
      // Count tickets currently locked (PENDING) or purchased (PAID)
      const soldCount = await tx.ticket.count({
        where: {
          orderItem: {
            ticketTypeId,
            order: {
              status: {
                in: ['pending', 'paid', 'PENDING', 'PAID'],
              },
            },
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
          status: 'pending',
          idempotencyKey: `order-idem-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`,
        },
      });

      // Create the OrderItem
      const orderItem = await tx.orderItem.create({
        data: {
          orderId: order.id,
          ticketTypeId,
          quantity,
          unitPrice: ticketType.price,
        },
      });

      // 5. Create the Ticket records
      const ticketData = Array.from({ length: quantity }).map((_, index) => ({
        orderItemId: orderItem.id,
        userId,
        qrCode: `QR-${order.id.slice(0, 8)}-${index}-${Math.floor(1000 + Math.random() * 9000)}`,
        status: 'valid',
      }));

      await tx.ticket.createMany({
        data: ticketData,
      });

      const tickets = await tx.ticket.findMany({
        where: {
          orderItem: {
            orderId: order.id,
          },
        },
      });

      const mappedTickets = tickets.map((t) => ({
        ...t,
        seatNumber: t.seatNumber || null,
      }));

      // 6. Invalidate Redis Cache (asynchronous/non-blocking delete)
      const cacheKey = `ticket_inventory:${ticketTypeId}`;
      try {
        if (isRedisReady()) {
          await runRedisOperation(() => redisClient.del(cacheKey));
        }
      } catch (err) {
        console.error(`[Redis Cache Invalidation Error] Failed to delete key ${cacheKey}:`, err);
      }

      return {
        order,
        tickets: mappedTickets,
      };
    });
  }

  /**
   * Retrieve order details by ID
   */
  public async getOrderById(orderId: string) {
    const order = await prisma.order.findUnique({
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

    // Flatten tickets from orderItems for frontend compatibility
    const flatTickets = order.orderItems.flatMap((item) =>
      item.tickets.map((t) => ({
        ...t,
        seatNumber: t.seatNumber || null,
      }))
    );

    return {
      order,
      tickets: flatTickets,
    };
  }

  /**
   * Retrieve order/ticket purchase history for a specific user
   */
  public async getHistory(userId: string) {
    const orders = await prisma.order.findMany({
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
        item.tickets.map((t) => ({
          id: t.id,
          qrCode: t.qrCode,
          status: t.status,
          seatNumber: t.seatNumber || null,
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
