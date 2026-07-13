import { Request, Response, NextFunction } from 'express';
import { ConcertService } from './concert.service';
import { waitingRoomService } from './waiting-room.service';
import { AppError } from '../../shared/lib/errors';

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

  public async getConcertAvailability(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const availability = await concertService.getConcertAvailability(id);

      return res.status(200).json({
        success: true,
        data: availability,
      });
    } catch (err) {
      next(err);
    }
  }

  public async joinWaitingRoom(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        throw new AppError(401, 'AUTH_TOKEN_EXPIRED', 'Authentication is required.');
      }

      const { concertId } = req.params;
      const status = await waitingRoomService.join(concertId, req.user.id);

      return res.status(200).json({
        success: true,
        data: status,
      });
    } catch (err) {
      next(err);
    }
  }

  public async getWaitingRoomStatus(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        throw new AppError(401, 'AUTH_TOKEN_EXPIRED', 'Authentication is required.');
      }

      const { concertId } = req.params;
      const status = await waitingRoomService.getStatus(concertId, req.user.id);

      return res.status(200).json({
        success: true,
        data: status,
      });
    } catch (err) {
      next(err);
    }
  }
}
