import { Controller, Get, Post, Body, Req, Res, UseGuards, Query } from '@nestjs/common';
import { Request, Response } from 'express';
import { z } from 'zod';
import { AuthGuard } from '../../shared/guards/auth.guard';
import { CurrentUser } from '../../shared/decorators/current-user.decorator';
import { PaymentService } from './payment.service';
import { AuthUser } from '../../shared/types/auth';

const createPaymentSchema = z.object({
  orderId: z.string().uuid(),
  gateway: z.string().trim().min(1),
});

const mockPaymentWebhookSchema = z.object({
  paymentId: z.string().uuid().optional(),
  status: z.enum(['SUCCESS', 'FAILED']).optional(),
}).passthrough();

@Controller('api/v1/payments')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @Post()
  @UseGuards(AuthGuard)
  async createPayment(@CurrentUser() user: AuthUser, @Body() body: unknown, @Req() req: Request, @Res() res: Response) {
    const dto = createPaymentSchema.parse(body);

    const ipAddress = req.ip || req.socket.remoteAddress || '127.0.0.1';

    const result = await this.paymentService.createPayment({
      userId: user.id,
      orderId: dto.orderId,
      gateway: dto.gateway,
      ipAddress,
    });

    return res.status(200).json({
      success: true,
      data: result,
    });
  }

  @Get('vnpay-ipn')
  async handleVNPAYIpn(@Query() query: Record<string, unknown>, @Res() res: Response) {
    const result = await this.paymentService.handleVNPAYIpn(query);
    if (result.code === '00') {
      return res.status(200).json({ RspCode: '00', Message: 'Confirm Success' });
    } else {
      return res.status(200).json({ RspCode: result.code, Message: result.message });
    }
  }

  @Get('vnpay-return')
  async handleVNPAYReturn(@Query() query: Record<string, unknown>, @Res() res: Response) {
    const html = await this.paymentService.handleVNPAYReturn(query);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.send(html);
  }

  @Get('mock-checkout')
  async renderMockCheckout(@Query() query: Record<string, unknown>, @Res() res: Response) {
    const html = await this.paymentService.renderMockCheckout(query);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.send(html);
  }

  @Post('webhook')
  async handleWebhook(@Body() body: unknown, @Req() req: Request, @Res() res: Response) {
    const signature = req.headers['x-mock-payment-webhook-secret'];
    const dto = mockPaymentWebhookSchema.parse(body);
    const result = await this.paymentService.handleWebhook(dto, Array.isArray(signature) ? signature[0] : signature);
    return res.status(200).json({
      success: true,
      data: result,
    });
  }
}
