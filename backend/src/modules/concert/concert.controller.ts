import { Request, Response, NextFunction } from 'express';
import { ConcertService } from './concert.service';

const concertService = new ConcertService();

export class ConcertController {
  public async getConcerts(req: Request, res: Response, next: NextFunction) {
    try {
      const { search, artist, date, location } = req.query;

      const concerts = await concertService.getConcerts({
        search: search ? String(search) : undefined,
        artist: artist ? String(artist) : undefined,
        date: date ? String(date) : undefined,
        location: location ? String(location) : undefined,
      });

      return res.status(200).json({
        success: true,
        data: concerts,
      });
    } catch (err) {
      next(err);
    }
  }

  public async getConcertById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const concert = await concertService.getConcertById(id);

      return res.status(200).json({
        success: true,
        data: concert,
      });
    } catch (err) {
      next(err);
    }
  }
}
