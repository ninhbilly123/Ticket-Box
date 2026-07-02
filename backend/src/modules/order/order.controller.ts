import { Request, Response, NextFunction } from 'express';
import { AppError } from '../../shared/lib/errors';
import { orderHoldService } from './order-hold.service';

export class OrderController {
  public async holdOrder(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        throw new AppError(401, 'AUTH_TOKEN_EXPIRED', 'Authentication is required.');
      }

      const idempotencyKey = req.headers['idempotency-key'];
      if (!idempotencyKey || Array.isArray(idempotencyKey)) {
        throw new AppError(400, 'MISSING_IDEMPOTENCY_KEY', 'Idempotency-Key là bắt buộc.');
      }

      const { concertId, items } = req.body || {};
      if (!concertId || !Array.isArray(items)) {
        throw new AppError(400, 'INVALID_QUANTITY', 'concertId và items là bắt buộc.');
      }

      const result = await orderHoldService.holdOrder({
        userId: req.user.id,
        concertId: String(concertId),
        idempotencyKey,
        items,
      });

      return res.status(201).json({
        success: true,
        data: result,
      });
    } catch (error) {
      return next(error);
    }
  }
}

export const orderController = new OrderController();
