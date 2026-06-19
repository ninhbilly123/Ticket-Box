import { Request, Response, NextFunction } from 'express';
import { TicketService } from './ticket.service';

const ticketService = new TicketService();

export class TicketController {
  public async bookTickets(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId, concertId, ticketTypeId, quantity } = req.body;

      if (!userId || !concertId || !ticketTypeId || quantity === undefined) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'BAD_REQUEST',
            message: 'Thiếu các thông tin bắt buộc: userId, concertId, ticketTypeId, quantity.',
          },
        });
      }

      const result = await ticketService.bookTickets({
        userId: String(userId),
        concertId: String(concertId),
        ticketTypeId: String(ticketTypeId),
        quantity: Number(quantity),
      });

      return res.status(201).json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  public async getOrder(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const order = await ticketService.getOrderById(id);

      return res.status(200).json({
        success: true,
        data: order,
      });
    } catch (err) {
      next(err);
    }
  }

  public async getHistory(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Vui lòng đăng nhập để xem lịch sử đơn hàng.',
          },
        });
      }

      const result = await ticketService.getHistory(req.user.id);

      return res.status(200).json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }
}
