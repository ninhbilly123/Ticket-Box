import { Router } from 'express';
import { CheckinController } from './checkin.controller';

const router = Router();
const checkinController = new CheckinController();

// 1. Quét soát vé trực tuyến (Online scan)
router.post('/scan', (req, res, next) => checkinController.scanTicket(req, res, next));

// 2. Đồng bộ lịch sử quét offline (Offline sync)
router.post('/sync', (req, res, next) => checkinController.syncOfflineLogs(req, res, next));

// 3. Tra cứu danh sách khách mời VIP
router.get('/vip-guests', (req, res, next) => checkinController.getVipGuests(req, res, next));

// 4. Soát vé trực tiếp cho khách mời VIP
router.post('/vip-guests/:id/checkin', (req, res, next) => checkinController.checkinVipGuest(req, res, next));

// 5. Thống kê soát vé real-time theo concert
router.get('/stats/:concertId', (req, res, next) => checkinController.getCheckinStats(req, res, next));

export default router;
export { router as checkinRoutes };
