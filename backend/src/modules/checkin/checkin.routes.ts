import { Router } from 'express';
import { CheckinController } from './checkin.controller';
import { authenticate } from '../../shared/middleware/auth';
import { requireRoles } from '../../shared/middleware/roles';

const router = Router();
const checkinController = new CheckinController();

router.use(authenticate, requireRoles('CHECKIN_STAFF'));

router.get('/concerts', (req, res, next) => checkinController.listAssignedConcerts(req, res, next));
router.post('/scan', (req, res, next) => checkinController.scanTicket(req, res, next));
router.post('/sync', (req, res, next) => checkinController.syncOfflineLogs(req, res, next));
router.get('/vip-guests', (req, res, next) => checkinController.getVipGuests(req, res, next));
router.post('/vip-guests/:id/checkin', (req, res, next) => checkinController.checkinVipGuest(req, res, next));
router.get('/stats/:concertId', (req, res, next) => checkinController.getCheckinStats(req, res, next));

export default router;
export { router as checkinRoutes };
