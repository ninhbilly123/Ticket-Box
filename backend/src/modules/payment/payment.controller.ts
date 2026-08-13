import { Controller, Get, Post, Body, Req, Res, UseGuards, Query } from '@nestjs/common';
import { Request, Response } from 'express';
import { AuthGuard } from '../../shared/guards/auth.guard';
import { CurrentUser } from '../../shared/decorators/current-user.decorator';
import { PaymentService } from './payment.service';
import { AppError } from '../../shared/lib/errors';
import { AuthUser } from '../../shared/types/auth';

@Controller('api/v1/payments')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @Post()
  @UseGuards(AuthGuard)
  async createPayment(@CurrentUser() user: AuthUser, @Body() body: any, @Req() req: Request, @Res() res: Response) {
    const { orderId, gateway } = body;

    if (!orderId || !gateway) {
      throw new AppError(400, 'BAD_REQUEST', 'Thiếu thông tin thanh toán: orderId hoặc gateway.');
    }

    const ipAddress = req.ip || req.socket.remoteAddress || '127.0.0.1';

    const result = await this.paymentService.createPayment({
      userId: user.id,
      orderId: String(orderId),
      gateway: String(gateway),
      ipAddress,
    });

    return res.status(200).json({
      success: true,
      data: result,
    });
  }

  @Get('vnpay-ipn')
  async handleVNPAYIpn(@Query() query: any, @Res() res: Response) {
    const result = await this.paymentService.handleVNPAYIpn(query);
    if (result.code === '00') {
      return res.status(200).json({ RspCode: '00', Message: 'Confirm Success' });
    } else {
      return res.status(200).json({ RspCode: result.code, Message: result.message });
    }
  }

  @Get('vnpay-return')
  async handleVNPAYReturn(@Query() query: any, @Res() res: Response) {
    const html = await this.paymentService.handleVNPAYReturn(query);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.send(html);
  }

  @Get('mock-checkout')
  async renderMockCheckout(@Query() query: any, @Res() res: Response) {
    const html = await this.paymentService.renderMockCheckout(query);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.send(html);
  }

  @Post('webhook')
  async handleWebhook(@Body() body: any, @Req() req: Request, @Res() res: Response) {
    const signature = req.headers['x-mock-payment-webhook-secret'];
    const result = await this.paymentService.handleWebhook(body, Array.isArray(signature) ? signature[0] : signature);
    return res.status(200).json({
      success: true,
      data: result,
    });
  }
}
