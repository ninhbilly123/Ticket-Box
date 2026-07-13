import { Router } from 'express';
import { AdminController } from './admin.controller';
import { authenticate } from '../../shared/middleware/auth';
import { requireRoles } from '../../shared/middleware/roles';
import multer from 'multer';
import { MAX_SEAT_MAP_SIZE } from '../../shared/lib/seat-map-svg';
import { AppError } from '../../shared/lib/errors';

const router = Router();
const controller = new AdminController();
const seatMapUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_SEAT_MAP_SIZE },
  fileFilter: (_req, file, callback) => {
    const isSvg = file.mimetype === 'image/svg+xml' || file.originalname.toLowerCase().endsWith('.svg');
    if (isSvg) {
      callback(null, true);
      return;
    }
    callback(new AppError(400, 'SEAT_MAP_FILE_TYPE_INVALID', 'Chỉ chấp nhận file SVG.'));
  },
});

router.use(authenticate);

router.get('/concerts', requireRoles('ORGANIZER'), (req, res, next) => controller.listConcerts(req, res, next));
router.post('/concerts', requireRoles('ORGANIZER'), (req, res, next) => controller.createConcert(req, res, next));
router.get('/concerts/:id', requireRoles('ORGANIZER'), (req, res, next) => controller.getConcert(req, res, next));
router.patch('/concerts/:id', requireRoles('ORGANIZER'), (req, res, next) => controller.updateConcert(req, res, next));
router.get('/concerts/:id/readiness', requireRoles('ORGANIZER'), (req, res, next) => controller.getConcertReadiness(req, res, next));
router.post('/concerts/:id/publish', requireRoles('ORGANIZER'), (req, res, next) => controller.publishConcert(req, res, next));
router.post('/concerts/:id/cancel', requireRoles('ORGANIZER'), (req, res, next) => controller.cancelConcert(req, res, next));
router.get('/concerts/:id/artists', requireRoles('ORGANIZER'), (req, res, next) => controller.listConcertArtists(req, res, next));
router.post('/concerts/:id/artists', requireRoles('ORGANIZER'), (req, res, next) => controller.addConcertArtist(req, res, next));
router.delete('/concerts/:id/artists/:artistId', requireRoles('ORGANIZER'), (req, res, next) => controller.removeConcertArtist(req, res, next));
router.post('/concerts/:id/seat-map', requireRoles('ORGANIZER'), seatMapUpload.single('file'), (req, res, next) => controller.uploadSeatMap(req, res, next));
router.delete('/concerts/:id/seat-map', requireRoles('ORGANIZER'), (req, res, next) => controller.deleteSeatMap(req, res, next));

router.get('/concerts/:concertId/ticket-types', requireRoles('ORGANIZER'), (req, res, next) => controller.listTicketTypes(req, res, next));
router.post('/concerts/:concertId/ticket-types', requireRoles('ORGANIZER'), (req, res, next) => controller.createTicketType(req, res, next));
router.patch('/ticket-types/:id', requireRoles('ORGANIZER'), (req, res, next) => controller.updateTicketType(req, res, next));
router.delete('/ticket-types/:id', requireRoles('ORGANIZER'), (req, res, next) => controller.deleteTicketType(req, res, next));

router.get('/ticket-types/:id/inventory', requireRoles('ORGANIZER'), (req, res, next) => controller.getInventory(req, res, next));
router.patch('/ticket-types/:id/inventory', requireRoles('ORGANIZER'), (req, res, next) => controller.updateInventory(req, res, next));

router.get('/staff', requireRoles('ORGANIZER'), (req, res, next) => controller.listStaffUsers(req, res, next));
router.post('/staff', requireRoles('ORGANIZER'), (req, res, next) => controller.createStaffUser(req, res, next));
router.get('/concerts/:concertId/staff-assignments', requireRoles('ORGANIZER'), (req, res, next) => controller.listStaffAssignments(req, res, next));
router.post('/concerts/:concertId/staff-assignments', requireRoles('ORGANIZER'), (req, res, next) => controller.createStaffAssignment(req, res, next));
router.delete('/staff-assignments/:id', requireRoles('ORGANIZER'), (req, res, next) => controller.deleteStaffAssignment(req, res, next));

router.get('/whitelist-email-configs', requireRoles('ORGANIZER'), (req, res, next) => controller.listWhitelistConfigs(req, res, next));
router.post('/whitelist-email-configs', requireRoles('ORGANIZER'), (req, res, next) => controller.createWhitelistConfig(req, res, next));
router.patch('/whitelist-email-configs/:id', requireRoles('ORGANIZER'), (req, res, next) => controller.updateWhitelistConfig(req, res, next));
router.delete('/whitelist-email-configs/:id', requireRoles('ORGANIZER'), (req, res, next) => controller.deleteWhitelistConfig(req, res, next));

router.get('/concerts/:id/revenue-summary', requireRoles('ORGANIZER'), (req, res, next) => controller.revenueSummary(req, res, next));
router.get('/concerts/:id/sales-stats', requireRoles('ORGANIZER'), (req, res, next) => controller.revenueSummary(req, res, next));

export default router;
export { router as adminRoutes };
