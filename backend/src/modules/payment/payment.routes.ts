import { Router } from 'express';
import { PaymentController } from './payment.controller';
import { idempotencyMiddleware } from '../../shared/middleware/idempotency';

const router = Router();
const paymentController = new PaymentController();

// GET /api/v1/payments/mock-checkout - Renders the payment simulation screen
router.get('/mock-checkout', (req, res, next) => paymentController.renderMockCheckout(req, res, next));

// POST /api/v1/payments - Create payment transaction and redirect URL (Idempotent endpoint)
router.post('/', idempotencyMiddleware, (req, res, next) => paymentController.createPayment(req, res, next));

// POST /api/v1/payments/webhook - Webhook transaction callback processing
router.post('/webhook', (req, res, next) => paymentController.handleWebhook(req, res, next));

export default router;
export { router as paymentRoutes };
