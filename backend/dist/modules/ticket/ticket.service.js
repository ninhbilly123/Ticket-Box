"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TicketService = void 0;
const prisma_1 = require("../../shared/lib/prisma");
const redis_1 = __importDefault(require("../../shared/lib/redis"));
const errors_1 = require("../../shared/lib/errors");
class TicketService {
    /**
     * Book tickets with transaction, per-user limit checking, pessimistic locks, and cache invalidation
     */
    async bookTickets(params) {
        const { userId, concertId, ticketTypeId, quantity } = params;
        if (quantity <= 0) {
            throw new errors_1.AppError(400, 'INVALID_QUANTITY', 'Số lượng vé đặt mua phải lớn hơn 0.');
        }
        // Wrap in interactive transaction
        return await prisma_1.prisma.$transaction(async (tx) => {
            // 1. Acquire pessimistic lock on the TicketType record to prevent concurrent updates on the inventory
            const ticketTypes = await tx.$queryRaw `
        SELECT id, price, total_quantity as "totalQuantity", max_limit_per_user as "maxLimitPerUser"
        FROM ticket_types 
        WHERE id = ${ticketTypeId} 
        LIMIT 1 
        FOR UPDATE
      `;
            if (ticketTypes.length === 0) {
                throw new errors_1.AppError(404, 'TICKET_TYPE_NOT_FOUND', 'Không tìm thấy loại vé yêu cầu.');
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
                throw new errors_1.AppError(400, 'LIMIT_EXCEEDED', `Bạn đã mua ${alreadyBought} vé của phân hạng này. Giới hạn tối đa là ${ticketType.maxLimitPerUser} vé. Bạn chỉ được mua thêm tối đa ${Math.max(0, ticketType.maxLimitPerUser - alreadyBought)} vé.`);
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
                throw new errors_1.AppError(400, 'OUT_OF_STOCK', `Hạng vé này không đủ số lượng yêu cầu. Còn lại: ${remaining} vé.`);
            }
            // 4. Create the Order
            // Set to PAID automatically for testing/simplification since payment flows are out of scope
            const totalAmount = Number(ticketType.price) * quantity;
            const order = await tx.order.create({
                data: {
                    userId,
                    concertId,
                    totalAmount,
                    status: 'PAID',
                },
            });
            // 5. Create the Ticket records
            // Creating multiple records for each seat
            const ticketData = Array.from({ length: quantity }).map((_, index) => ({
                orderId: order.id,
                ticketTypeId,
                seatNumber: `SEAT-${Math.floor(100 + Math.random() * 900)}`, // Dummy seat number
                status: 'BOOKED', // Already paid order
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
                if (redis_1.default.isOpen) {
                    await redis_1.default.del(cacheKey);
                }
            }
            catch (err) {
                console.error(`[Redis Cache Invalidation Error] Failed to delete key ${cacheKey}:`, err);
            }
            return {
                order,
                tickets,
            };
        });
    }
}
exports.TicketService = TicketService;
