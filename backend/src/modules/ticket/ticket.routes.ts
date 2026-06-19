import { Router } from 'express';
import { TicketController } from './ticket.controller';
import { authenticate } from '../../shared/middleware/auth';

const router = Router();
const ticketController = new TicketController();

// POST /api/v1/tickets/book - Book tickets for a concert
router.post('/book', (req, res, next) => ticketController.bookTickets(req, res, next));

// GET /api/v1/tickets/history - Get user ticket purchase history
router.get('/history', authenticate, (req, res, next) => ticketController.getHistory(req, res, next));

// GET /api/v1/tickets/order/:id - Get order details and status
router.get('/order/:id', (req, res, next) => ticketController.getOrder(req, res, next));

export default router;
export { router as ticketRoutes };
