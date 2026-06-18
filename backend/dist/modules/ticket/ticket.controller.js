"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TicketController = void 0;
const ticket_service_1 = require("./ticket.service");
const ticketService = new ticket_service_1.TicketService();
class TicketController {
    async bookTickets(req, res, next) {
        try {
            const { userId, concertId, ticketTypeId, quantity } = req.body;
            if (!userId || !concertId || !ticketTypeId || quantity === undefined) {
                return res.status(400).json({
                    success: false,
                    error: {
                        code: 'BAD_REQUEST',
                        message: 'Thiếu các thông tin bắt buộc: userId, concertId, ticketTypeId, quantity.',
                    },
                });
            }
            const result = await ticketService.bookTickets({
                userId: String(userId),
                concertId: String(concertId),
                ticketTypeId: String(ticketTypeId),
                quantity: Number(quantity),
            });
            return res.status(201).json({
                success: true,
                data: result,
            });
        }
        catch (err) {
            next(err);
        }
    }
    async getOrder(req, res, next) {
        try {
            const { id } = req.params;
            const order = await ticketService.getOrderById(id);
            return res.status(200).json({
                success: true,
                data: order,
            });
        }
        catch (err) {
            next(err);
        }
    }
    async scanTicket(req, res, next) {
        try {
            const { qrToken } = req.body;
            const result = await ticketService.scanTicket(qrToken);
            return res.status(200).json({
                success: true,
                data: result,
            });
        }
        catch (err) {
            next(err);
        }
    }
}
exports.TicketController = TicketController;
