import { Router } from 'express';
import { TicketController } from './ticket.controller';
import { authenticate } from '../../shared/middleware/auth';

const router = Router();
const ticketController = new TicketController();

// POST /api/v1/tickets/book - Book tickets for a concert
router.post('/book', (_req, res) =>
  res.status(410).json({
    success: false,
    error: {
      code: 'LEGACY_BOOKING_DISABLED',
      message: 'Luồng đặt vé cũ đã bị vô hiệu hóa. Vui lòng dùng /api/v1/orders/hold.',
    },
  })
);

// GET /api/v1/tickets/history - Get user ticket purchase history
router.get('/history', authenticate, (req, res, next) => ticketController.getHistory(req, res, next));

// GET /api/v1/tickets/order/:id - Get order details and status
router.get('/order/:id', authenticate, (req, res, next) => ticketController.getOrder(req, res, next));

export default router;
export { router as ticketRoutes };
