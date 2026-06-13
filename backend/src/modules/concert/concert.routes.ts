import { Router } from 'express';
import { ConcertController } from './concert.controller';

const router = Router();
const concertController = new ConcertController();

// GET /api/v1/concerts - List concerts with search/filter queries
router.get('/', (req, res, next) => concertController.getConcerts(req, res, next));

// GET /api/v1/concerts/:id - Details of a specific concert
router.get('/:id', (req, res, next) => concertController.getConcertById(req, res, next));

export default router;
export { router as concertRoutes };
