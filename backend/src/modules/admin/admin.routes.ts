import { Router } from 'express';
import { AdminController } from './admin.controller';
import { authenticate } from '../../shared/middleware/auth';
import { requireRoles } from '../../shared/middleware/roles';

const router = Router();
const controller = new AdminController();

router.use(authenticate);

router.get('/concerts', requireRoles('ADMIN', 'ORGANIZER'), (req, res, next) => controller.listConcerts(req, res, next));
router.post('/concerts', requireRoles('ADMIN', 'ORGANIZER'), (req, res, next) => controller.createConcert(req, res, next));
router.get('/concerts/:id', requireRoles('ADMIN', 'ORGANIZER'), (req, res, next) => controller.getConcert(req, res, next));
router.patch('/concerts/:id', requireRoles('ADMIN', 'ORGANIZER'), (req, res, next) => controller.updateConcert(req, res, next));
router.post('/concerts/:id/publish', requireRoles('ADMIN', 'ORGANIZER'), (req, res, next) => controller.publishConcert(req, res, next));
router.post('/concerts/:id/cancel', requireRoles('ADMIN', 'ORGANIZER'), (req, res, next) => controller.cancelConcert(req, res, next));

router.get('/concerts/:concertId/ticket-types', requireRoles('ADMIN', 'ORGANIZER'), (req, res, next) => controller.listTicketTypes(req, res, next));
router.post('/concerts/:concertId/ticket-types', requireRoles('ADMIN', 'ORGANIZER'), (req, res, next) => controller.createTicketType(req, res, next));
router.patch('/ticket-types/:id', requireRoles('ADMIN', 'ORGANIZER'), (req, res, next) => controller.updateTicketType(req, res, next));
router.delete('/ticket-types/:id', requireRoles('ADMIN', 'ORGANIZER'), (req, res, next) => controller.deleteTicketType(req, res, next));

router.get('/ticket-types/:id/inventory', requireRoles('ADMIN', 'ORGANIZER'), (req, res, next) => controller.getInventory(req, res, next));
router.patch('/ticket-types/:id/inventory', requireRoles('ADMIN', 'ORGANIZER'), (req, res, next) => controller.updateInventory(req, res, next));

router.get('/concerts/:concertId/staff-assignments', requireRoles('ADMIN', 'ORGANIZER'), (req, res, next) => controller.listStaffAssignments(req, res, next));
router.post('/concerts/:concertId/staff-assignments', requireRoles('ADMIN', 'ORGANIZER'), (req, res, next) => controller.createStaffAssignment(req, res, next));
router.delete('/staff-assignments/:id', requireRoles('ADMIN', 'ORGANIZER'), (req, res, next) => controller.deleteStaffAssignment(req, res, next));

router.get('/whitelist-email-configs', requireRoles('ADMIN', 'ORGANIZER'), (req, res, next) => controller.listWhitelistConfigs(req, res, next));
router.post('/whitelist-email-configs', requireRoles('ADMIN', 'ORGANIZER'), (req, res, next) => controller.createWhitelistConfig(req, res, next));
router.patch('/whitelist-email-configs/:id', requireRoles('ADMIN', 'ORGANIZER'), (req, res, next) => controller.updateWhitelistConfig(req, res, next));
router.delete('/whitelist-email-configs/:id', requireRoles('ADMIN', 'ORGANIZER'), (req, res, next) => controller.deleteWhitelistConfig(req, res, next));

router.get('/concerts/:id/revenue-summary', requireRoles('ADMIN', 'ORGANIZER'), (req, res, next) => controller.revenueSummary(req, res, next));
router.get('/concerts/:id/sales-stats', requireRoles('ADMIN', 'ORGANIZER'), (req, res, next) => controller.revenueSummary(req, res, next));

router.get('/users', requireRoles('ADMIN'), (req, res, next) => controller.listUsers(req, res, next));
router.patch('/users/:id/role', requireRoles('ADMIN'), (req, res, next) => controller.updateUserRole(req, res, next));
router.patch('/users/:id/status', requireRoles('ADMIN'), (req, res, next) => controller.updateUserStatus(req, res, next));

export default router;
export { router as adminRoutes };

