import { Injectable } from '@nestjs/common';
import { AppError } from '../../shared/lib/errors';
import { AuthUser } from '../../shared/types/auth';
import { PrismaService } from '../../shared/modules/prisma.service';
import { AuthorizationService } from '../rbac/authorization.service';

@Injectable()
export class AdminConcertAccessService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authorizationService: AuthorizationService
  ) {}

  public concertScope(user: AuthUser) {
    if (user.role !== 'ORGANIZER') {
      return { id: '00000000-0000-0000-0000-000000000000' };
    }
    if (!user.organizationId) {
      return { organizerId: user.id };
    }
    return {
      OR: [
        { organizationId: user.organizationId },
        { organizerId: user.id },
      ],
    };
  }

  public async assertCanManageConcert(user: AuthUser, concertId: string) {
    const concert = await this.prisma.concert.findUnique({ where: { id: concertId } });
    if (!concert) throw new AppError(404, 'CONCERT_NOT_FOUND', 'Concert not found.');

    const canManage = await this.authorizationService.canManageConcert(user, concertId);
    if (!canManage) {
      throw new AppError(403, 'FORBIDDEN_RESOURCE', 'You do not have permission to manage this concert.');
    }
    return concert;
  }

  public resolveWritableOrganization(user: AuthUser, organizationId?: string): string {
    if (user.role !== 'ORGANIZER' || !user.organizationId) {
      throw new AppError(403, 'FORBIDDEN_ROLE', 'Only ORGANIZER can manage organization resources.');
    }
    if (organizationId && organizationId !== user.organizationId) {
      throw new AppError(403, 'FORBIDDEN_RESOURCE', 'Cannot manage another organization.');
    }
    return user.organizationId;
  }

  public assertDraft(status: string) {
    if (status !== 'DRAFT') {
      throw new AppError(409, 'CONCERT_CONFIG_LOCKED', 'Chi duoc thay doi cau hinh nay khi concert o trang thai DRAFT.');
    }
  }
}
