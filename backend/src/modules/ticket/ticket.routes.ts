import { Router } from 'express';
import { TicketController } from './ticket.controller';

const router = Router();
const ticketController = new TicketController();

// POST /api/v1/tickets/book - Book tickets for a concert
router.post('/book', (req, res, next) => ticketController.bookTickets(req, res, next));

// GET /api/v1/tickets/order/:id - Get order details and status
router.get('/order/:id', (req, res, next) => ticketController.getOrder(req, res, next));

// POST /api/v1/tickets/scan - Scan e-ticket using qrToken
router.post('/scan', (req, res, next) => ticketController.scanTicket(req, res, next));

export default router;
export { router as ticketRoutes };
