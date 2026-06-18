import { Router } from 'express';
import { VipGuestSyncController } from './vip-guest-sync.controller';

const router = Router();
const controller = new VipGuestSyncController();

router.get('/sponsors', (req, res, next) => controller.listSponsorEmails(req, res, next));
router.post('/sponsors', (req, res, next) => controller.createSponsorEmail(req, res, next));
router.patch('/sponsors/:id', (req, res, next) => controller.updateSponsorEmail(req, res, next));
router.get('/import-reports', (req, res, next) => controller.listImportReports(req, res, next));
router.get('/import-reports/:id', (req, res, next) => controller.getImportReport(req, res, next));

export default router;
export { router as vipGuestSyncRoutes };
