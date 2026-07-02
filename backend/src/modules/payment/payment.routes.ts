import { Router } from 'express';
import { PaymentController } from './payment.controller';
import { idempotencyMiddleware } from '../../shared/middleware/idempotency';

const router = Router();
const paymentController = new PaymentController();

// GET /api/v1/payments/vnpay-ipn - Process VNPAY Webhook IPN (Server-to-Server)
router.get('/vnpay-ipn', (req, res, next) => paymentController.handleVNPAYIpn(req, res, next));

// GET /api/v1/payments/vnpay-return - Process VNPAY Return URL (Browser Redirection)
router.get('/vnpay-return', (req, res, next) => paymentController.handleVNPAYReturn(req, res, next));

// GET /api/v1/payments/mock-checkout - Renders the payment simulation screen
router.get('/mock-checkout', (req, res, next) => paymentController.renderMockCheckout(req, res, next));

// POST /api/v1/payments - Create payment transaction and redirect URL (Idempotent endpoint)
router.post('/', idempotencyMiddleware, (req, res, next) => paymentController.createPayment(req, res, next));

// POST /api/v1/payments/webhook - Webhook transaction callback processing
router.post('/webhook', (req, res, next) => paymentController.handleWebhook(req, res, next));

export default router;
export { router as paymentRoutes };
