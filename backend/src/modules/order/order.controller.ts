import { Controller, Post, UseGuards, Body, Headers, Res } from '@nestjs/common';
import { z } from 'zod';
import { AuthGuard } from '../../shared/guards/auth.guard';
import { OrderHoldService } from './order-hold.service';
import { CurrentUser } from '../../shared/decorators/current-user.decorator';
import { AppError } from '../../shared/lib/errors';
import { Response } from 'express';
import { AuthUser } from '../../shared/types/auth';

const holdOrderSchema = z.object({
  concertId: z.string().uuid(),
  items: z.array(z.object({
    ticketTypeId: z.string().uuid(),
    quantity: z.coerce.number().int().positive(),
  })).min(1),
});

@Controller('api/v1/orders')
export class OrderController {
  constructor(private readonly orderHoldService: OrderHoldService) {}

  @Post('hold')
  @UseGuards(AuthGuard)
  async holdOrder(
    @CurrentUser() user: AuthUser,
    @Body() body: unknown,
    @Headers('idempotency-key') idempotencyKey: string,
    @Headers('checkout-token') checkoutToken: string | undefined,
    @Res() res: Response,
  ) {
    if (!idempotencyKey || Array.isArray(idempotencyKey)) {
      throw new AppError(400, 'MISSING_IDEMPOTENCY_KEY', 'Idempotency-Key là bắt buộc.');
    }

    const dto = holdOrderSchema.parse(body);

    const result = await this.orderHoldService.holdOrder({
      userId: user.id,
      concertId: dto.concertId,
      idempotencyKey: String(idempotencyKey),
      checkoutToken,
      items: dto.items,
    });

    return res.status(201).json({
      success: true,
      data: result,
    });
  }
}
