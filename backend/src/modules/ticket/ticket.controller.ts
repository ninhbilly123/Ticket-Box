import { Controller, Get, Post, Param, UseGuards, Res } from '@nestjs/common';
import { Response } from 'express';
import { AuthGuard } from '../../shared/guards/auth.guard';
import { CurrentUser } from '../../shared/decorators/current-user.decorator';
import { TicketService } from './ticket.service';
import { AuthorizationService } from '../rbac/authorization.service';
import { AppError } from '../../shared/lib/errors';

@Controller('api/v1/tickets')
export class TicketController {
  constructor(
    private readonly ticketService: TicketService,
    private readonly authorizationService: AuthorizationService,
  ) {}

  @Post('book')
  async bookTickets(@Res() res: Response) {
    return res.status(410).json({
      success: false,
      error: {
        code: 'LEGACY_BOOKING_DISABLED',
        message: 'Lu"ng `t vAc cc `A b< vA hiu hA3a. Vui lAng dA1ng /api/v1/orders/hold.',
      },
    });
  }

  @Get('history')
  @UseGuards(AuthGuard)
  async getHistory(@CurrentUser() user: any, @Res() res: Response) {
    const result = await this.ticketService.getHistory(user.id);

    return res.status(200).json({
      success: true,
      data: result,
    });
  }

  @Get('order/:id')
  @UseGuards(AuthGuard)
  async getOrder(@Param('id') id: string, @CurrentUser() user: any, @Res() res: Response) {
    const canView = await this.authorizationService.canViewOrder(user, id);
    if (!canView) {
      throw new AppError(403, 'FORBIDDEN_RESOURCE', 'Ban khong co quyen xem don hang nay.');
    }

    const order = await this.ticketService.getOrderById(id);

    return res.status(200).json({
      success: true,
      data: order,
    });
  }
}
