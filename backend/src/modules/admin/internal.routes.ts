import { Router } from 'express';
import { AdminController } from './admin.controller';

const router = Router();
const controller = new AdminController();

router.get('/whitelist-email-configs/active', (req, res, next) => controller.listActiveWhitelistConfigs(req, res, next));

export default router;
export { router as internalRoutes };

