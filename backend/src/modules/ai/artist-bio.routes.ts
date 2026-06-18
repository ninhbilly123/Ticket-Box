import { Router } from 'express';
import multer from 'multer';
import { ArtistBioController } from './artist-bio.controller';

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});
const controller = new ArtistBioController();

router.post('/concerts/:concertId/upload', upload.single('file'), (req, res, next) =>
  controller.uploadPdf(req, res, next)
);
router.get('/concerts/:concertId', (req, res, next) =>
  controller.getLatestByConcert(req, res, next)
);
router.patch('/:id/review', (req, res, next) => controller.reviewBio(req, res, next));
router.post('/:id/publish', (req, res, next) => controller.publishBio(req, res, next));

export default router;
export { router as artistBioRoutes };
