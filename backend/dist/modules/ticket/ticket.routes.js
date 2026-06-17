"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ticketRoutes = void 0;
const express_1 = require("express");
const ticket_controller_1 = require("./ticket.controller");
const router = (0, express_1.Router)();
exports.ticketRoutes = router;
const ticketController = new ticket_controller_1.TicketController();
// POST /api/v1/tickets/book - Book tickets for a concert
router.post('/book', (req, res, next) => ticketController.bookTickets(req, res, next));
exports.default = router;
