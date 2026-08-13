import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../shared/modules/prisma.service';
import { AuthUser } from '../../shared/types/auth';

@Injectable()
export class AuthorizationService {
  constructor(private readonly prisma: PrismaService) {}

  public async canManageOrganization(user: AuthUser, organizationId: string): Promise<boolean> {
    return user.role === 'ORGANIZER' && user.organizationId === organizationId;
  }

  public async canManageConcert(user: AuthUser, concertId: string): Promise<boolean> {
    if (user.role !== 'ORGANIZER' || !user.organizationId) return false;

    const concert = await this.prisma.concert.findUnique({
      where: { id: concertId },
      select: { organizationId: true, organizerId: true },
    });

    if (!concert) return false;
    return concert.organizationId === user.organizationId || concert.organizerId === user.id;
  }

  public async canViewOrder(user: AuthUser, orderId: string): Promise<boolean> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      select: {
        userId: true,
        concert: { select: { organizationId: true, organizerId: true } },
      },
    });

    if (!order) return false;
    if (user.role === 'AUDIENCE') return order.userId === user.id;
    if (user.role === 'ORGANIZER') {
      return Boolean(
        user.organizationId &&
          (order.concert.organizationId === user.organizationId || order.concert.organizerId === user.id)
      );
    }
    return false;
  }

  public async canViewTicket(user: AuthUser, ticketId: string): Promise<boolean> {
    const ticket = await this.prisma.ticket.findUnique({
      where: { id: ticketId },
      select: {
        userId: true,
        orderItem: {
          select: {
            order: {
              select: {
                concert: { select: { organizationId: true, organizerId: true } },
              },
            },
          },
        },
      },
    });

    if (!ticket) return false;
    if (user.role === 'AUDIENCE') return ticket.userId === user.id;
    if (user.role === 'ORGANIZER') {
      const concert = ticket.orderItem.order.concert;
      return Boolean(user.organizationId && (concert.organizationId === user.organizationId || concert.organizerId === user.id));
    }
    return false;
  }

  public async canScanConcert(user: AuthUser, concertId: string, gateId?: string): Promise<boolean> {
    if (user.role !== 'CHECKIN_STAFF') return false;

    const assignment = await this.prisma.staffAssignment.findFirst({
      where: {
        staffId: user.id,
        concertId,
        ...(gateId ? { gateId } : {}),
      },
    });

    return Boolean(assignment);
  }
}
