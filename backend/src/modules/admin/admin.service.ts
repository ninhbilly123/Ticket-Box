import { Injectable } from '@nestjs/common';
import type { WhitelistConfigStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { AppError } from '../../shared/lib/errors';
import { AuthUser } from '../../shared/types/auth';
import { PrismaService } from '../../shared/modules/prisma.service';
import { PAID_ORDER_STATUSES } from '../../shared/domain/statuses';
import { AuthorizationService } from '../rbac/authorization.service';
import { normalizeRole } from '../rbac/roles';
import { publishConcertListingInvalidation } from '../concert/concert-listing-events';
import { sanitizeAndValidateSeatMapSvg } from '../../shared/lib/seat-map-svg';
import { CheckinStatsService } from '../checkin/checkin-stats.service';
import { AdminConcertAccessService } from './admin-concert-access.service';
import { AdminReadinessService } from './admin-readiness.service';
import { AdminTicketTypeService, TicketTypeInput, TicketTypeUpdateInput } from './admin-ticket-type.service';

interface ConcertUpdateInput {
  eventCode?: string;
  name?: string;
  venue?: string;
  startAt?: string;
  saleOpenAt?: string;
  description?: string;
  seatMapEnabled?: boolean;
}

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authorizationService: AuthorizationService,
    private readonly concertAccess: AdminConcertAccessService,
    private readonly readinessService: AdminReadinessService,
    private readonly ticketTypeService: AdminTicketTypeService,
    private readonly checkinStatsService: CheckinStatsService
  ) {}
  public async listConcerts(user: AuthUser) {
    return this.prisma.concert.findMany({
      where: this.concertScope(user),
      include: {
        ticketTypes: { include: { inventory: true } },
        artists: { include: { artist: true } },
        organizer: { select: { id: true, email: true, fullName: true } },
        organization: true,
      },
      orderBy: { startAt: 'asc' },
    });
  }

  public async getConcert(user: AuthUser, concertId: string) {
    await this.assertCanManageConcert(user, concertId);
    return this.prisma.concert.findUniqueOrThrow({
      where: { id: concertId },
      include: {
        ticketTypes: { include: { inventory: true } },
        artists: { include: { artist: true } },
        staffAssignments: { include: { staff: { select: { id: true, email: true, fullName: true, role: true } } } },
        whitelistEmailConfigs: true,
      },
    });
  }

  public async createConcert(user: AuthUser, input: {
    eventCode: string;
    name: string;
    venue: string;
    startAt: string;
    saleOpenAt: string;
    description?: string;
    seatMapEnabled?: boolean;
    organizationId?: string;
  }) {
    const organizationId = this.resolveWritableOrganization(user, input.organizationId);
    const startAt = new Date(input.startAt);
    const saleOpenAt = new Date(input.saleOpenAt);
    this.validateConcertSchedule(startAt, saleOpenAt, true);
    await this.assertEventCodeAvailable(input.eventCode);

    const concert = await this.prisma.concert.create({
      data: {
        organizerId: user.id,
        organizationId,
        eventCode: input.eventCode.trim().toUpperCase(),
        name: input.name.trim(),
        venue: input.venue.trim(),
        startAt,
        saleOpenAt,
        status: 'DRAFT',
        description: input.description,
        seatMapEnabled: input.seatMapEnabled ?? false,
      },
    });

    await publishConcertListingInvalidation('concert.created', { concertId: concert.id });
    return concert;
  }

  public async updateConcert(user: AuthUser, concertId: string, input: ConcertUpdateInput) {
    const current = await this.assertCanManageConcert(user, concertId);
    const changedFields = Object.keys(input);
    if (current.status !== 'DRAFT' && changedFields.some((field) => field !== 'description')) {
      throw new AppError(409, 'CONCERT_CONFIG_LOCKED', 'Sau khi publish chỉ được cập nhật mô tả concert.');
    }

    const data: Record<string, unknown> = {};
    for (const field of ['name', 'venue', 'description'] as const) {
      if (typeof input[field] === 'string') {
        data[field] = input[field]!.trim();
      }
    }
    if (input.eventCode) {
      await this.assertEventCodeAvailable(input.eventCode, concertId);
      data.eventCode = input.eventCode.trim().toUpperCase();
    }
    if (input.startAt) data.startAt = new Date(input.startAt);
    if (input.saleOpenAt) data.saleOpenAt = new Date(input.saleOpenAt);
    if (typeof input.seatMapEnabled === 'boolean') data.seatMapEnabled = input.seatMapEnabled;

    const startAt = (data.startAt as Date | undefined) || current.startAt;
    const saleOpenAt = (data.saleOpenAt as Date | undefined) || current.saleOpenAt;
    this.validateConcertSchedule(startAt, saleOpenAt, current.status === 'DRAFT');

    const concert = await this.prisma.concert.update({ where: { id: concertId }, data });
    await publishConcertListingInvalidation('concert.updated', { concertId });
    return concert;
  }

  public async publishConcert(user: AuthUser, concertId: string) {
    const concert = await this.assertCanManageConcert(user, concertId);
    if (concert.status !== 'DRAFT') {
      throw new AppError(400, 'CONCERT_INVALID_STATUS_TRANSITION', 'Concert cannot be published from current status.');
    }
    const readiness = await this.readinessService.evaluateConcertReadiness(concertId);
    if (!readiness.ready) {
      throw new AppError(409, 'CONCERT_NOT_READY', readiness.blockingIssues.join(' '));
    }
    const updated = await this.prisma.concert.update({ where: { id: concertId }, data: { status: 'PUBLISHED' } });
    await publishConcertListingInvalidation('concert.published', { concertId });
    return updated;
  }

  public async getConcertReadiness(user: AuthUser, concertId: string) {
    await this.assertCanManageConcert(user, concertId);
    return this.readinessService.evaluateConcertReadiness(concertId);
  }

  public async listConcertArtists(user: AuthUser, concertId: string) {
    await this.assertCanManageConcert(user, concertId);
    const relations = await this.prisma.concertArtist.findMany({
      where: { concertId },
      include: { artist: true },
      orderBy: { artist: { name: 'asc' } },
    });
    return relations.map((relation) => relation.artist);
  }

  public async addConcertArtist(user: AuthUser, concertId: string, artistName: string) {
    const concert = await this.assertCanManageConcert(user, concertId);
    this.assertDraft(concert.status);
    const name = artistName.trim();
    let artist = await this.prisma.artist.findFirst({
      where: { name: { equals: name, mode: 'insensitive' } },
    });
    if (!artist) {
      artist = await this.prisma.artist.create({ data: { name } });
    }
    await this.prisma.concertArtist.upsert({
      where: { concertId_artistId: { concertId, artistId: artist.id } },
      create: { concertId, artistId: artist.id },
      update: {},
    });
    await publishConcertListingInvalidation('concert.updated', { concertId });
    return artist;
  }

  public async removeConcertArtist(user: AuthUser, concertId: string, artistId: string) {
    const concert = await this.assertCanManageConcert(user, concertId);
    this.assertDraft(concert.status);
    const relation = await this.prisma.concertArtist.findUnique({
      where: { concertId_artistId: { concertId, artistId } },
    });
    if (!relation) throw new AppError(404, 'CONCERT_ARTIST_NOT_FOUND', 'Nghệ sĩ không thuộc concert này.');
    await this.prisma.concertArtist.delete({ where: { concertId_artistId: { concertId, artistId } } });
    await publishConcertListingInvalidation('concert.updated', { concertId });
    return { deleted: true };
  }

  public async uploadSeatMap(user: AuthUser, concertId: string, file: Express.Multer.File) {
    const concert = await this.assertCanManageConcert(user, concertId);
    this.assertDraft(concert.status);
    if (!file.originalname.toLowerCase().endsWith('.svg') && file.mimetype !== 'image/svg+xml') {
      throw new AppError(400, 'SEAT_MAP_FILE_TYPE_INVALID', 'Chỉ chấp nhận file SVG.');
    }
    const ticketTypes = await this.prisma.ticketType.findMany({
      where: { concertId, status: 'ACTIVE' },
      select: { zoneCode: true },
    });
    if (!ticketTypes.length) {
      throw new AppError(400, 'SEAT_MAP_TICKET_TYPES_REQUIRED', 'Hãy tạo loại vé trước khi upload sơ đồ.');
    }
    const inspected = sanitizeAndValidateSeatMapSvg(
      file.buffer.toString('utf8'),
      ticketTypes.map((ticketType) => ticketType.zoneCode)
    );
    const updated = await this.prisma.concert.update({
      where: { id: concertId },
      data: { svgSeatingMap: inspected.svg },
    });
    await publishConcertListingInvalidation('concert.updated', { concertId });
    return { concert: updated, zoneCodes: inspected.zoneCodes };
  }

  public async deleteSeatMap(user: AuthUser, concertId: string) {
    const concert = await this.assertCanManageConcert(user, concertId);
    this.assertDraft(concert.status);
    const updated = await this.prisma.concert.update({
      where: { id: concertId },
      data: { svgSeatingMap: null },
    });
    await publishConcertListingInvalidation('concert.updated', { concertId });
    return updated;
  }

  public async cancelConcert(user: AuthUser, concertId: string, reason?: string) {
    const concert = await this.assertCanManageConcert(user, concertId);
    if (!['DRAFT', 'PUBLISHED', 'ON_SALE', 'SALE_CLOSED'].includes(concert.status)) {
      throw new AppError(409, 'CONCERT_INVALID_STATUS_TRANSITION', 'Concert không thể hủy từ trạng thái hiện tại.');
    }
    const updated = await this.prisma.concert.update({
      where: { id: concertId },
      data: {
        status: 'CANCELLED',
        cancelledReason: reason || 'Cancelled by organizer',
        cancelledAt: new Date(),
      },
    });
    await publishConcertListingInvalidation('concert.cancelled', { concertId });
    return updated;
  }

  public async listTicketTypes(user: AuthUser, concertId: string) {
    return this.ticketTypeService.listTicketTypes(user, concertId);
  }

  public async createTicketType(user: AuthUser, concertId: string, input: TicketTypeInput) {
    return this.ticketTypeService.createTicketType(user, concertId, input);
  }

  public async updateTicketType(user: AuthUser, ticketTypeId: string, input: TicketTypeUpdateInput) {
    return this.ticketTypeService.updateTicketType(user, ticketTypeId, input);
  }

  public async deleteTicketType(user: AuthUser, ticketTypeId: string) {
    return this.ticketTypeService.deleteTicketType(user, ticketTypeId);
  }

  public async getInventory(user: AuthUser, ticketTypeId: string) {
    return this.ticketTypeService.getInventory(user, ticketTypeId);
  }

  public async updateInventory(user: AuthUser, ticketTypeId: string, totalQuantity: number) {
    return this.ticketTypeService.updateInventory(user, ticketTypeId, totalQuantity);
  }
  public async listStaffAssignments(user: AuthUser, concertId: string) {
    await this.assertCanManageConcert(user, concertId);
    return this.prisma.staffAssignment.findMany({
      where: { concertId },
      include: { staff: { select: { id: true, email: true, fullName: true, role: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  public async getCheckinStats(user: AuthUser, concertId: string) {
    await this.assertCanManageConcert(user, concertId);
    return this.checkinStatsService.getStats(concertId);
  }

  public async createStaffAssignment(user: AuthUser, concertId: string, staffId: string, gateId: string) {
    await this.assertCanManageConcert(user, concertId);
    const staff = await this.prisma.user.findUnique({ where: { id: staffId } });
    if (!staff || normalizeRole(staff.role) !== 'CHECKIN_STAFF') {
      throw new AppError(403, 'FORBIDDEN_ROLE', 'Assigned user must have CHECKIN_STAFF role.');
    }
    if (!user.organizationId || staff.organizationId !== user.organizationId) {
      throw new AppError(403, 'FORBIDDEN_RESOURCE', 'Cannot assign staff outside your organization.');
    }

    return this.prisma.staffAssignment.upsert({
      where: { staffId_concertId_gateId: { staffId, concertId, gateId } },
      create: { staffId, concertId, gateId, createdBy: user.id },
      update: { createdBy: user.id },
    });
  }

  public async deleteStaffAssignment(user: AuthUser, assignmentId: string) {
    const assignment = await this.prisma.staffAssignment.findUnique({ where: { id: assignmentId } });
    if (!assignment) throw new AppError(404, 'STAFF_ASSIGNMENT_NOT_FOUND', 'Staff assignment not found.');
    await this.assertCanManageConcert(user, assignment.concertId);
    await this.prisma.staffAssignment.delete({ where: { id: assignmentId } });
    return { deleted: true };
  }

  public async listWhitelistConfigs(user: AuthUser) {
    const organizationId = this.resolveWritableOrganization(user);

    return this.prisma.whitelistEmailConfig.findMany({
      where: { organizationId },
      include: { concert: { select: { id: true, name: true } }, organization: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  public async listActiveWhitelistConfigs() {
    return this.prisma.whitelistEmailConfig.findMany({
      where: { status: 'ACTIVE' },
      include: { concert: { select: { id: true, name: true } }, organization: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  public async createWhitelistConfig(user: AuthUser, input: {
    organizationId?: string;
    concertId?: string;
    mailboxAddress: string;
    allowedSenderEmail: string;
    subjectKeyword: string;
    status?: WhitelistConfigStatus;
  }) {
    const organizationId = this.resolveWritableOrganization(user, input.organizationId);
    if (input.concertId) {
      await this.assertCanManageConcert(user, input.concertId);
    }

    if (!input.mailboxAddress.includes('@') || !input.allowedSenderEmail.includes('@')) {
      throw new AppError(400, 'WHITELIST_CONFIG_INVALID', 'Mailbox and sender email must be valid email-like values.');
    }
    if (input.status && !['ACTIVE', 'INACTIVE'].includes(input.status)) {
      throw new AppError(400, 'WHITELIST_CONFIG_INVALID', 'Whitelist config status is invalid.');
    }

    return this.prisma.whitelistEmailConfig.create({
      data: {
        organizationId,
        concertId: input.concertId,
        mailboxAddress: input.mailboxAddress,
        allowedSenderEmail: input.allowedSenderEmail,
        subjectKeyword: input.subjectKeyword,
        status: input.status || 'ACTIVE',
      },
    });
  }

  public async updateWhitelistConfig(user: AuthUser, configId: string, input: Record<string, unknown>) {
    const config = await this.prisma.whitelistEmailConfig.findUnique({ where: { id: configId } });
    if (!config) throw new AppError(404, 'WHITELIST_CONFIG_NOT_FOUND', 'Whitelist config not found.');
    const canManage = await this.authorizationService.canManageOrganization(user, config.organizationId);
    if (!canManage) throw new AppError(403, 'FORBIDDEN_RESOURCE', 'Cannot manage this whitelist config.');

    const data: Record<string, unknown> = {};
    for (const field of ['mailboxAddress', 'allowedSenderEmail', 'subjectKeyword'] as const) {
      if (typeof input[field] === 'string') data[field] = input[field];
    }
    if (typeof input.status === 'string') {
      if (!['ACTIVE', 'INACTIVE'].includes(input.status)) {
        throw new AppError(400, 'WHITELIST_CONFIG_INVALID', 'Whitelist config status is invalid.');
      }
      data.status = input.status;
    }
    return this.prisma.whitelistEmailConfig.update({ where: { id: configId }, data });
  }

  public async deleteWhitelistConfig(user: AuthUser, configId: string) {
    const config = await this.prisma.whitelistEmailConfig.findUnique({ where: { id: configId } });
    if (!config) throw new AppError(404, 'WHITELIST_CONFIG_NOT_FOUND', 'Whitelist config not found.');
    const canManage = await this.authorizationService.canManageOrganization(user, config.organizationId);
    if (!canManage) throw new AppError(403, 'FORBIDDEN_RESOURCE', 'Cannot manage this whitelist config.');
    await this.prisma.whitelistEmailConfig.delete({ where: { id: configId } });
    return { deleted: true };
  }

  public async revenueSummary(user: AuthUser, concertId: string) {
    await this.assertCanManageConcert(user, concertId);
    const paidOrders = await this.prisma.order.findMany({
      where: { concertId, status: { in: PAID_ORDER_STATUSES } },
      include: {
        orderItems: { include: { ticketType: true, tickets: true } },
      },
    });

    let totalRevenue = 0;
    let ticketsSold = 0;
    const byTicketType: Record<string, { quantity: number; revenue: number }> = {};

    for (const order of paidOrders) {
      totalRevenue += Number(order.totalAmount);
      for (const item of order.orderItems) {
        ticketsSold += item.quantity;
        const current = byTicketType[item.ticketType.name] || { quantity: 0, revenue: 0 };
        current.quantity += item.quantity;
        current.revenue += Number(item.unitPrice) * item.quantity;
        byTicketType[item.ticketType.name] = current;
      }
    }

    return {
      concertId,
      paidOrders: paidOrders.length,
      ticketsSold,
      totalRevenue,
      byTicketType,
    };
  }

  public async listStaffUsers(user: AuthUser) {
    if (user.role !== 'ORGANIZER' || !user.organizationId) {
      throw new AppError(403, 'FORBIDDEN_ROLE', 'Only ORGANIZER can list check-in staff.');
    }

    return this.prisma.user.findMany({
      where: {
        organizationId: user.organizationId,
        role: 'CHECKIN_STAFF',
        status: 'ACTIVE',
      },
      select: {
        id: true,
        email: true,
        fullName: true,
        phone: true,
        role: true,
        status: true,
        organizationId: true,
        createdAt: true,
      },
      orderBy: { fullName: 'asc' },
    });
  }

  public async createStaffUser(user: AuthUser, input: {
    email: string;
    password: string;
    fullName: string;
    phone?: string;
  }) {
    const organizationId = this.resolveWritableOrganization(user);
    const email = input.email.toLowerCase();
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new AppError(400, 'AUTH_EMAIL_EXISTS', 'Email is already registered.');
    }

    const passwordHash = await bcrypt.hash(input.password, 10);
    return this.prisma.user.create({
      data: {
        email,
        passwordHash,
        fullName: input.fullName,
        phone: input.phone,
        role: 'CHECKIN_STAFF',
        organizationId,
        status: 'ACTIVE',
      },
      select: {
        id: true,
        email: true,
        fullName: true,
        phone: true,
        role: true,
        status: true,
        organizationId: true,
        createdAt: true,
      },
    });
  }

  private concertScope(user: AuthUser) {
    return this.concertAccess.concertScope(user);
  }

  private async assertCanManageConcert(user: AuthUser, concertId: string) {
    return this.concertAccess.assertCanManageConcert(user, concertId);
  }

  private resolveWritableOrganization(user: AuthUser, organizationId?: string): string {
    return this.concertAccess.resolveWritableOrganization(user, organizationId);
  }

  private validateConcertSchedule(startAt: Date, saleOpenAt: Date, requireFuture: boolean) {
    if (!Number.isFinite(startAt.getTime()) || !Number.isFinite(saleOpenAt.getTime())) {
      throw new AppError(400, 'CONCERT_SCHEDULE_INVALID', 'Ngày giờ concert không hợp lệ.');
    }
    if (saleOpenAt >= startAt) {
      throw new AppError(400, 'CONCERT_SCHEDULE_INVALID', 'Thời gian mở bán phải trước thời gian biểu diễn.');
    }
    if (requireFuture && startAt <= new Date()) {
      throw new AppError(400, 'CONCERT_SCHEDULE_INVALID', 'Thời gian biểu diễn phải ở tương lai.');
    }
  }

  private async assertEventCodeAvailable(eventCode: string, excludeConcertId?: string) {
    const existing = await this.prisma.concert.findFirst({
      where: {
        eventCode: eventCode.trim().toUpperCase(),
        ...(excludeConcertId ? { id: { not: excludeConcertId } } : {}),
      },
      select: { id: true },
    });
    if (existing) {
      throw new AppError(409, 'CONCERT_EVENT_CODE_EXISTS', 'Mã sự kiện đã được sử dụng.');
    }
  }

  private assertDraft(status: string) {
    return this.concertAccess.assertDraft(status);
  }
}

