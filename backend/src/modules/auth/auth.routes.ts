import { Router } from 'express';
import { AuthController } from './auth.controller';
import { authenticate } from '../../shared/middleware/auth';

const router = Router();
const controller = new AuthController();

router.post('/register', (req, res, next) => controller.register(req, res, next));
router.post('/login', (req, res, next) => controller.login(req, res, next));
router.post('/logout', (req, res, next) => controller.logout(req, res, next));
router.post('/refresh', (req, res, next) => controller.refresh(req, res, next));
router.get('/me', authenticate, (req, res, next) => controller.me(req, res, next));

export default router;
export { router as authRoutes };

