import { Request, Response, NextFunction } from 'express';
import { TicketService } from './ticket.service';
import { authorizationService } from '../rbac/authorization.service';
import { AppError } from '../../shared/lib/errors';

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
      if (!req.user) {
        throw new AppError(401, 'AUTH_TOKEN_EXPIRED', 'Authentication is required.');
      }

      const { id } = req.params;
      const canView = await authorizationService.canViewOrder(req.user, id);
      if (!canView) {
        throw new AppError(403, 'FORBIDDEN_RESOURCE', 'Ban khong co quyen xem don hang nay.');
      }

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
