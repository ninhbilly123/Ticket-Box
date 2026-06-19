import { Router } from 'express';
import { ConcertController } from './concert.controller';
import { authenticate, optionalAuthenticate } from '../../shared/middleware/auth';
import { concertListRateLimit } from '../../shared/middleware/concertListRateLimit';
import { concertAvailabilityRateLimit, concertDetailRateLimit } from '../../shared/middleware/concertPublicRateLimit';

const router = Router();
const concertController = new ConcertController();

// GET /api/v1/concerts - List concerts with search/filter queries
router.get('/', optionalAuthenticate, concertListRateLimit, (req, res, next) => concertController.getConcerts(req, res, next));

// GET /api/v1/concerts/:id/availability - Short-lived availability for display only
router.get('/:id/availability', concertAvailabilityRateLimit, (req, res, next) =>
  concertController.getConcertAvailability(req, res, next)
);

// POST /api/v1/concerts/:concertId/waiting-room/join - Join hot concert waiting room
router.post('/:concertId/waiting-room/join', authenticate, (req, res, next) =>
  concertController.joinWaitingRoom(req, res, next)
);

// GET /api/v1/concerts/:concertId/waiting-room/status - Check waiting room status
router.get('/:concertId/waiting-room/status', authenticate, (req, res, next) =>
  concertController.getWaitingRoomStatus(req, res, next)
);

// GET /api/v1/concerts/:id - Details of a specific concert
router.get('/:id', concertDetailRateLimit, (req, res, next) => concertController.getConcertById(req, res, next));

export default router;
export { router as concertRoutes };
