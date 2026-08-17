import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../shared/modules/prisma.service';
import { PAID_ORDER_STATUSES, USED_TICKET_STATUS } from '../../shared/domain/statuses';

@Injectable()
export class CheckinStatsService {
  constructor(private readonly prisma: PrismaService) {}

  public async getStats(concertId: string) {
    const ticketTypes = await this.prisma.ticketType.findMany({
      where: { concertId },
    });

    const breakdown: Record<string, { total: number; checkedIn: number; percent: number }> = {};
    let grandTotal = 0;
    let grandCheckedIn = 0;

    for (const ticketType of ticketTypes) {
      const paidTicketFilter = {
        orderItem: {
          ticketTypeId: ticketType.id,
          order: {
            status: { in: PAID_ORDER_STATUSES },
          },
        },
      };

      const [total, checkedIn] = await Promise.all([
        this.prisma.ticket.count({ where: paidTicketFilter }),
        this.prisma.ticket.count({
          where: {
            ...paidTicketFilter,
            status: USED_TICKET_STATUS,
          },
        }),
      ]);

      breakdown[ticketType.name] = {
        total,
        checkedIn,
        percent: total > 0 ? Number(((checkedIn / total) * 100).toFixed(1)) : 0,
      };

      grandTotal += total;
      grandCheckedIn += checkedIn;
    }

    return {
      totalTickets: grandTotal,
      checkedInTickets: grandCheckedIn,
      percent: grandTotal > 0 ? Number(((grandCheckedIn / grandTotal) * 100).toFixed(1)) : 0,
      byTicketType: breakdown,
    };
  }
}
