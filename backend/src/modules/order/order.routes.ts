import { Router } from 'express';
import { authenticate } from '../../shared/middleware/auth';
import { holdOrderRateLimit, requireCheckoutTokenForHotConcert } from '../../shared/middleware/holdOrderProtection';
import { orderController } from './order.controller';

const router = Router();

router.post('/hold', authenticate, holdOrderRateLimit, requireCheckoutTokenForHotConcert, (req, res, next) =>
  orderController.holdOrder(req, res, next)
);

export default router;
export { router as orderRoutes };
