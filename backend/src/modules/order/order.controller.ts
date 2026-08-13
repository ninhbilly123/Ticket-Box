import { Controller, Post, UseGuards, Body, Headers, Req, Res } from '@nestjs/common';
import { AuthGuard } from '../../shared/guards/auth.guard';
import { OrderHoldService } from './order-hold.service';
import { CurrentUser } from '../../shared/decorators/current-user.decorator';
import { AppError } from '../../shared/lib/errors';
import { Response } from 'express';
import { AuthUser } from '../../shared/types/auth';

@Controller('api/v1/orders')
export class OrderController {
  constructor(private readonly orderHoldService: OrderHoldService) {}

  @Post('hold')
  @UseGuards(AuthGuard)
  async holdOrder(
    @CurrentUser() user: AuthUser,
    @Body() body: any,
    @Headers('idempotency-key') idempotencyKey: string,
    @Res() res: Response,
  ) {
    if (!idempotencyKey || Array.isArray(idempotencyKey)) {
      throw new AppError(400, 'MISSING_IDEMPOTENCY_KEY', 'Idempotency-Key là bắt buộc.');
    }

    const { concertId, items } = body || {};
    if (!concertId || !Array.isArray(items)) {
      throw new AppError(400, 'INVALID_QUANTITY', 'concertId và items là bắt buộc.');
    }

    const result = await this.orderHoldService.holdOrder({
      userId: user.id,
      concertId: String(concertId),
      idempotencyKey: String(idempotencyKey),
      items,
    });

    return res.status(201).json({
      success: true,
      data: result,
    });
  }
}
