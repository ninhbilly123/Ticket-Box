import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { ArtistBioService } from './artist-bio.service';

const artistBioService = new ArtistBioService();

const reviewSchema = z.object({
  reviewedBio: z.string().min(1),
});

export class ArtistBioController {
  public async uploadPdf(req: Request, res: Response, next: NextFunction) {
    try {
      const artistBio = await artistBioService.uploadPdf({
        concertId: req.params.concertId,
        file: req.file,
        createdBy: req.user?.id,
      });

      return res.status(201).json({ success: true, data: artistBio });
    } catch (err) {
      next(err);
    }
  }

  public async getLatestByConcert(req: Request, res: Response, next: NextFunction) {
    try {
      const artistBio = await artistBioService.getLatestByConcert(req.params.concertId);
      return res.status(200).json({ success: true, data: artistBio });
    } catch (err) {
      next(err);
    }
  }

  public async reviewBio(req: Request, res: Response, next: NextFunction) {
    try {
      const body = reviewSchema.parse(req.body);
      const artistBio = await artistBioService.reviewBio({
        artistBioId: req.params.id,
        reviewedBio: body.reviewedBio,
        reviewedBy: req.user?.id,
      });
      return res.status(200).json({ success: true, data: artistBio });
    } catch (err) {
      next(err);
    }
  }

  public async publishBio(req: Request, res: Response, next: NextFunction) {
    try {
      const artistBio = await artistBioService.publishBio(req.params.id);
      return res.status(200).json({ success: true, data: artistBio });
    } catch (err) {
      next(err);
    }
  }
}
