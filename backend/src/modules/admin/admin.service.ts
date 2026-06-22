import bcrypt from 'bcryptjs';
import { prisma } from '../../shared/lib/prisma';
import { AppError } from '../../shared/lib/errors';
import { AuthUser } from '../../shared/types/auth';
import { authorizationService } from '../rbac/authorization.service';
import { normalizeRole } from '../rbac/roles';
import { publishConcertListingInvalidation } from '../concert/concert-listing-events';
import {
  assertZoneCode,
  inspectSeatMapSvg,
  sanitizeAndValidateSeatMapSvg,
} from '../../shared/lib/seat-map-svg';

const PAID_STATUSES = ['paid', 'PAID'];

interface ConcertUpdateInput {
  eventCode?: string;
  name?: string;
  venue?: string;
  startAt?: string;
  saleOpenAt?: string;
  description?: string;
  seatMapEnabled?: boolean;
}

interface TicketTypeInput {
  name: string;
  zoneCode: string;
  price: number;
  totalQuantity: number;
  maxPerAccount: number;
  saleOpenAt?: string;
  saleCloseAt?: string;
}

interface TicketTypeUpdateInput {
  name?: string;
  zoneCode?: string;
  price?: number;
  maxPerAccount?: number;
  saleOpenAt?: string | null;
  saleCloseAt?: string | null;
  status?: 'ACTIVE' | 'INACTIVE';
}

export interface ConcertReadinessCheck {
  key: string;
  label: string;
  status: 'PASS' | 'FAIL' | 'WARNING';
  message: string;
  blocking: boolean;
}

export class AdminService {
  public async listConcerts(user: AuthUser) {
    return prisma.concert.findMany({
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
    return prisma.concert.findUniqueOrThrow({
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

    const concert = await prisma.concert.create({
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

    const concert = await prisma.concert.update({ where: { id: concertId }, data });
    await publishConcertListingInvalidation('concert.updated', { concertId });
    return concert;
  }

  public async publishConcert(user: AuthUser, concertId: string) {
    const concert = await this.assertCanManageConcert(user, concertId);
    if (concert.status !== 'DRAFT') {
      throw new AppError(400, 'CONCERT_INVALID_STATUS_TRANSITION', 'Concert cannot be published from current status.');
    }
    const readiness = await this.evaluateConcertReadiness(concertId);
    if (!readiness.ready) {
      throw new AppError(409, 'CONCERT_NOT_READY', readiness.blockingIssues.join(' '));
    }
    const updated = await prisma.concert.update({ where: { id: concertId }, data: { status: 'PUBLISHED' } });
    await publishConcertListingInvalidation('concert.published', { concertId });
    return updated;
  }

  public async getConcertReadiness(user: AuthUser, concertId: string) {
    await this.assertCanManageConcert(user, concertId);
    return this.evaluateConcertReadiness(concertId);
  }

  public async listConcertArtists(user: AuthUser, concertId: string) {
    await this.assertCanManageConcert(user, concertId);
    const relations = await prisma.concertArtist.findMany({
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
    let artist = await prisma.artist.findFirst({
      where: { name: { equals: name, mode: 'insensitive' } },
    });
    if (!artist) {
      artist = await prisma.artist.create({ data: { name } });
    }
    await prisma.concertArtist.upsert({
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
    const relation = await prisma.concertArtist.findUnique({
      where: { concertId_artistId: { concertId, artistId } },
    });
    if (!relation) throw new AppError(404, 'CONCERT_ARTIST_NOT_FOUND', 'Nghệ sĩ không thuộc concert này.');
    await prisma.concertArtist.delete({ where: { concertId_artistId: { concertId, artistId } } });
    await publishConcertListingInvalidation('concert.updated', { concertId });
    return { deleted: true };
  }

  public async uploadSeatMap(user: AuthUser, concertId: string, file: Express.Multer.File) {
    const concert = await this.assertCanManageConcert(user, concertId);
    this.assertDraft(concert.status);
    if (!file.originalname.toLowerCase().endsWith('.svg') && file.mimetype !== 'image/svg+xml') {
      throw new AppError(400, 'SEAT_MAP_FILE_TYPE_INVALID', 'Chỉ chấp nhận file SVG.');
    }
    const ticketTypes = await prisma.ticketType.findMany({
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
    const updated = await prisma.concert.update({
      where: { id: concertId },
      data: { svgSeatingMap: inspected.svg },
    });
    await publishConcertListingInvalidation('concert.updated', { concertId });
    return { concert: updated, zoneCodes: inspected.zoneCodes };
  }

  public async deleteSeatMap(user: AuthUser, concertId: string) {
    const concert = await this.assertCanManageConcert(user, concertId);
    this.assertDraft(concert.status);
    const updated = await prisma.concert.update({
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
    const updated = await prisma.concert.update({
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
    await this.assertCanManageConcert(user, concertId);
    return prisma.ticketType.findMany({
      where: { concertId },
      include: { inventory: true },
      orderBy: { price: 'desc' },
    });
  }

  public async createTicketType(user: AuthUser, concertId: string, input: TicketTypeInput) {
    const concert = await this.assertCanManageConcert(user, concertId);
    this.assertDraft(concert.status);
    const zoneCode = assertZoneCode(input.zoneCode);
    this.validateTicketTypeInput(input, concert);
    await this.assertTicketTypeIdentityAvailable(concertId, input.name, zoneCode);

    const ticketType = await prisma.$transaction(async (tx) => {
      const ticketType = await tx.ticketType.create({
        data: {
          concertId,
          name: input.name.trim(),
          zoneCode,
          price: input.price,
          totalQuantity: input.totalQuantity,
          maxPerAccount: input.maxPerAccount,
          saleOpenAt: input.saleOpenAt ? new Date(input.saleOpenAt) : null,
          saleCloseAt: input.saleCloseAt ? new Date(input.saleCloseAt) : null,
          status: 'ACTIVE',
        },
      });

      await tx.ticketInventory.create({
        data: {
          ticketTypeId: ticketType.id,
          totalQuantity: input.totalQuantity,
          availableQuantity: input.totalQuantity,
          reservedQuantity: 0,
          soldQuantity: 0,
        },
      });

      return ticketType;
    });

    await publishConcertListingInvalidation('ticket-type.updated', { concertId, ticketTypeId: ticketType.id });
    return ticketType;
  }

  public async updateTicketType(user: AuthUser, ticketTypeId: string, input: TicketTypeUpdateInput) {
    const ticketType = await prisma.ticketType.findUnique({ where: { id: ticketTypeId } });
    if (!ticketType) throw new AppError(404, 'TICKET_TYPE_NOT_FOUND', 'Ticket type not found.');
    const concert = await this.assertCanManageConcert(user, ticketType.concertId);
    this.assertDraft(concert.status);

    const data: Record<string, unknown> = {};
    if (input.name) data.name = input.name.trim();
    if (input.zoneCode) data.zoneCode = assertZoneCode(input.zoneCode);
    if (typeof input.price === 'number') {
      data.price = input.price;
    }
    if (typeof input.maxPerAccount === 'number') {
      if (input.maxPerAccount <= 0) throw new AppError(400, 'TICKET_QUANTITY_INVALID', 'maxPerAccount must be positive.');
      data.maxPerAccount = input.maxPerAccount;
    }
    if (input.saleOpenAt !== undefined) data.saleOpenAt = input.saleOpenAt ? new Date(input.saleOpenAt) : null;
    if (input.saleCloseAt !== undefined) data.saleCloseAt = input.saleCloseAt ? new Date(input.saleCloseAt) : null;
    if (input.status) data.status = input.status;

    const saleOpenAt = input.saleOpenAt !== undefined
      ? (input.saleOpenAt ? new Date(input.saleOpenAt) : null)
      : ticketType.saleOpenAt;
    const saleCloseAt = input.saleCloseAt !== undefined
      ? (input.saleCloseAt ? new Date(input.saleCloseAt) : null)
      : ticketType.saleCloseAt;
    this.validateTicketSaleWindow(saleOpenAt, saleCloseAt, concert);
    await this.assertTicketTypeIdentityAvailable(
      ticketType.concertId,
      (data.name as string | undefined) || ticketType.name,
      (data.zoneCode as string | undefined) || ticketType.zoneCode,
      ticketTypeId
    );

    const updated = await prisma.ticketType.update({ where: { id: ticketTypeId }, data });
    await publishConcertListingInvalidation('ticket-type.updated', {
      concertId: ticketType.concertId,
      ticketTypeId,
    });
    return updated;
  }

  public async deleteTicketType(user: AuthUser, ticketTypeId: string) {
    const ticketType = await prisma.ticketType.findUnique({ where: { id: ticketTypeId } });
    if (!ticketType) throw new AppError(404, 'TICKET_TYPE_NOT_FOUND', 'Ticket type not found.');
    const concert = await this.assertCanManageConcert(user, ticketType.concertId);
    this.assertDraft(concert.status);

    const soldOrReserved = await prisma.ticket.count({
      where: { orderItem: { ticketTypeId } },
    });
    if (soldOrReserved > 0) {
      throw new AppError(400, 'TICKET_QUANTITY_INVALID', 'Ticket type already has issued tickets.');
    }

    await prisma.ticketType.delete({ where: { id: ticketTypeId } });
    await publishConcertListingInvalidation('ticket-type.updated', {
      concertId: ticketType.concertId,
      ticketTypeId,
    });
    return { deleted: true };
  }

  public async getInventory(user: AuthUser, ticketTypeId: string) {
    const ticketType = await prisma.ticketType.findUnique({
      where: { id: ticketTypeId },
      include: { inventory: true },
    });
    if (!ticketType) throw new AppError(404, 'TICKET_TYPE_NOT_FOUND', 'Ticket type not found.');
    await this.assertCanManageConcert(user, ticketType.concertId);
    return ticketType.inventory || this.deriveInventory(ticketType);
  }

  public async updateInventory(user: AuthUser, ticketTypeId: string, totalQuantity: number) {
    const ticketType = await prisma.ticketType.findUnique({
      where: { id: ticketTypeId },
      include: { inventory: true },
    });
    if (!ticketType) throw new AppError(404, 'TICKET_TYPE_NOT_FOUND', 'Ticket type not found.');
    await this.assertCanManageConcert(user, ticketType.concertId);

    const reservedQuantity = ticketType.inventory?.reservedQuantity ?? ticketType.reservedQuantity;
    const soldQuantity = ticketType.inventory?.soldQuantity ?? ticketType.soldQuantity;
    if (totalQuantity < reservedQuantity + soldQuantity) {
      throw new AppError(400, 'TICKET_QUANTITY_INVALID', 'New total quantity cannot be less than sold plus reserved quantity.');
    }

    const inventory = await prisma.$transaction(async (tx) => {
      await tx.ticketType.update({
        where: { id: ticketTypeId },
        data: {
          totalQuantity,
          reservedQuantity,
          soldQuantity,
        },
      });

      return tx.ticketInventory.upsert({
        where: { ticketTypeId },
        create: {
          ticketTypeId,
          totalQuantity,
          availableQuantity: totalQuantity - reservedQuantity - soldQuantity,
          reservedQuantity,
          soldQuantity,
        },
        update: {
          totalQuantity,
          availableQuantity: totalQuantity - reservedQuantity - soldQuantity,
          reservedQuantity,
          soldQuantity,
        },
      });
    });
    await publishConcertListingInvalidation('ticket-type.updated', {
      concertId: ticketType.concertId,
      ticketTypeId,
    });
    return inventory;
  }

  public async listStaffAssignments(user: AuthUser, concertId: string) {
    await this.assertCanManageConcert(user, concertId);
    return prisma.staffAssignment.findMany({
      where: { concertId },
      include: { staff: { select: { id: true, email: true, fullName: true, role: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  public async createStaffAssignment(user: AuthUser, concertId: string, staffId: string, gateId: string) {
    await this.assertCanManageConcert(user, concertId);
    const staff = await prisma.user.findUnique({ where: { id: staffId } });
    if (!staff || normalizeRole(staff.role) !== 'CHECKIN_STAFF') {
      throw new AppError(403, 'FORBIDDEN_ROLE', 'Assigned user must have CHECKIN_STAFF role.');
    }
    if (!user.organizationId || staff.organizationId !== user.organizationId) {
      throw new AppError(403, 'FORBIDDEN_RESOURCE', 'Cannot assign staff outside your organization.');
    }

    return prisma.staffAssignment.upsert({
      where: { staffId_concertId_gateId: { staffId, concertId, gateId } },
      create: { staffId, concertId, gateId, createdBy: user.id },
      update: { createdBy: user.id },
    });
  }

  public async deleteStaffAssignment(user: AuthUser, assignmentId: string) {
    const assignment = await prisma.staffAssignment.findUnique({ where: { id: assignmentId } });
    if (!assignment) throw new AppError(404, 'STAFF_ASSIGNMENT_NOT_FOUND', 'Staff assignment not found.');
    await this.assertCanManageConcert(user, assignment.concertId);
    await prisma.staffAssignment.delete({ where: { id: assignmentId } });
    return { deleted: true };
  }

  public async listWhitelistConfigs(user: AuthUser) {
    const organizationId = this.resolveWritableOrganization(user);

    return prisma.whitelistEmailConfig.findMany({
      where: { organizationId },
      include: { concert: { select: { id: true, name: true } }, organization: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  public async listActiveWhitelistConfigs() {
    return prisma.whitelistEmailConfig.findMany({
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
    status?: string;
  }) {
    const organizationId = this.resolveWritableOrganization(user, input.organizationId);
    if (input.concertId) {
      await this.assertCanManageConcert(user, input.concertId);
    }

    if (!input.mailboxAddress.includes('@') || !input.allowedSenderEmail.includes('@')) {
      throw new AppError(400, 'WHITELIST_CONFIG_INVALID', 'Mailbox and sender email must be valid email-like values.');
    }

    return prisma.whitelistEmailConfig.create({
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
    const config = await prisma.whitelistEmailConfig.findUnique({ where: { id: configId } });
    if (!config) throw new AppError(404, 'WHITELIST_CONFIG_NOT_FOUND', 'Whitelist config not found.');
    const canManage = await authorizationService.canManageOrganization(user, config.organizationId);
    if (!canManage) throw new AppError(403, 'FORBIDDEN_RESOURCE', 'Cannot manage this whitelist config.');

    const data: Record<string, unknown> = {};
    for (const field of ['mailboxAddress', 'allowedSenderEmail', 'subjectKeyword', 'status'] as const) {
      if (typeof input[field] === 'string') data[field] = input[field];
    }
    return prisma.whitelistEmailConfig.update({ where: { id: configId }, data });
  }

  public async deleteWhitelistConfig(user: AuthUser, configId: string) {
    const config = await prisma.whitelistEmailConfig.findUnique({ where: { id: configId } });
    if (!config) throw new AppError(404, 'WHITELIST_CONFIG_NOT_FOUND', 'Whitelist config not found.');
    const canManage = await authorizationService.canManageOrganization(user, config.organizationId);
    if (!canManage) throw new AppError(403, 'FORBIDDEN_RESOURCE', 'Cannot manage this whitelist config.');
    await prisma.whitelistEmailConfig.delete({ where: { id: configId } });
    return { deleted: true };
  }

  public async revenueSummary(user: AuthUser, concertId: string) {
    await this.assertCanManageConcert(user, concertId);
    const paidOrders = await prisma.order.findMany({
      where: { concertId, status: { in: PAID_STATUSES } },
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

    return prisma.user.findMany({
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
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new AppError(400, 'AUTH_EMAIL_EXISTS', 'Email is already registered.');
    }

    const passwordHash = await bcrypt.hash(input.password, 10);
    return prisma.user.create({
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

  private async assertCanManageConcert(user: AuthUser, concertId: string) {
    const concert = await prisma.concert.findUnique({ where: { id: concertId } });
    if (!concert) throw new AppError(404, 'CONCERT_NOT_FOUND', 'Concert not found.');

    const canManage = await authorizationService.canManageConcert(user, concertId);
    if (!canManage) {
      throw new AppError(403, 'FORBIDDEN_RESOURCE', 'You do not have permission to manage this concert.');
    }
    return concert;
  }

  private resolveWritableOrganization(user: AuthUser, organizationId?: string): string {
    if (user.role !== 'ORGANIZER' || !user.organizationId) {
      throw new AppError(403, 'FORBIDDEN_ROLE', 'Only ORGANIZER can manage organization resources.');
    }
    if (organizationId && organizationId !== user.organizationId) {
      throw new AppError(403, 'FORBIDDEN_RESOURCE', 'Cannot manage another organization.');
    }
    return user.organizationId;
  }

  private async evaluateConcertReadiness(concertId: string) {
    const concert = await prisma.concert.findUnique({
      where: { id: concertId },
      include: {
        ticketTypes: { include: { inventory: true } },
        artists: true,
        staffAssignments: true,
        artistBios: { where: { status: 'PUBLISHED' }, take: 1 },
      },
    });
    if (!concert) throw new AppError(404, 'CONCERT_NOT_FOUND', 'Concert not found.');

    const checks: ConcertReadinessCheck[] = [];
    const addCheck = (
      key: string,
      label: string,
      passed: boolean,
      successMessage: string,
      failureMessage: string,
      blocking = true
    ) => {
      checks.push({
        key,
        label,
        status: passed ? 'PASS' : (blocking ? 'FAIL' : 'WARNING'),
        message: passed ? successMessage : failureMessage,
        blocking,
      });
    };

    addCheck(
      'basic-info',
      'Thông tin cơ bản',
      Boolean(concert.eventCode.trim() && concert.name.trim() && concert.venue.trim()),
      'Mã sự kiện, tên và địa điểm đã đầy đủ.',
      'Cần bổ sung mã sự kiện, tên và địa điểm.'
    );

    const scheduleValid = concert.saleOpenAt < concert.startAt && concert.startAt > new Date();
    addCheck(
      'schedule',
      'Lịch sự kiện',
      scheduleValid,
      'Thời gian mở bán và biểu diễn hợp lệ.',
      'Ngày biểu diễn phải ở tương lai và thời gian mở bán phải trước ngày biểu diễn.'
    );

    addCheck(
      'artists',
      'Nghệ sĩ',
      concert.artists.length > 0,
      `Đã gắn ${concert.artists.length} nghệ sĩ.`,
      'Cần gắn ít nhất một nghệ sĩ.'
    );

    const activeTicketTypes = concert.ticketTypes.filter((ticketType) => ticketType.status === 'ACTIVE');
    const invalidTicketTypes: string[] = [];
    for (const ticketType of activeTicketTypes) {
      const totalQuantity = ticketType.inventory?.totalQuantity ?? ticketType.totalQuantity;
      try {
        this.validateTicketSaleWindow(ticketType.saleOpenAt, ticketType.saleCloseAt, concert);
      } catch {
        invalidTicketTypes.push(`${ticketType.name}: thời gian bán không hợp lệ`);
      }
      if (totalQuantity <= 0) invalidTicketTypes.push(`${ticketType.name}: tồn kho phải lớn hơn 0`);
      if (ticketType.maxPerAccount <= 0 || Number(ticketType.price) < 0) {
        invalidTicketTypes.push(`${ticketType.name}: giá hoặc giới hạn mua không hợp lệ`);
      }
    }
    addCheck(
      'ticket-types',
      'Loại vé và tồn kho',
      activeTicketTypes.length > 0 && invalidTicketTypes.length === 0,
      `Có ${activeTicketTypes.length} loại vé active sẵn sàng bán.`,
      activeTicketTypes.length === 0
        ? 'Cần ít nhất một loại vé active.'
        : invalidTicketTypes.join('; ')
    );

    const zoneCodes = activeTicketTypes.map((ticketType) => ticketType.zoneCode);
    const normalizedZoneCodes = zoneCodes.map((code) => assertZoneCode(code));
    addCheck(
      'zone-codes',
      'Mã khu vực',
      normalizedZoneCodes.length > 0 && new Set(normalizedZoneCodes).size === normalizedZoneCodes.length,
      'Mã khu vực hợp lệ và không trùng.',
      'Mỗi loại vé active phải có mã khu vực hợp lệ và duy nhất.'
    );

    let seatMapValid = !concert.seatMapEnabled;
    let seatMapMessage = 'Concert không sử dụng sơ đồ; khách hàng sẽ chọn vé từ danh sách.';
    if (concert.seatMapEnabled) {
      if (!concert.svgSeatingMap) {
        seatMapMessage = 'Đã bật sơ đồ nhưng chưa upload file SVG.';
      } else {
        try {
          const inspected = inspectSeatMapSvg(concert.svgSeatingMap, normalizedZoneCodes);
          seatMapValid = inspected.missingZoneCodes.length === 0 && inspected.unknownZoneCodes.length === 0;
          seatMapMessage = seatMapValid
            ? `SVG đã ánh xạ ${inspected.zoneCodes.length} khu vực.`
            : `SVG thiếu [${inspected.missingZoneCodes.join(', ')}] hoặc thừa [${inspected.unknownZoneCodes.join(', ')}].`;
        } catch (error) {
          seatMapMessage = error instanceof Error ? error.message : 'SVG không hợp lệ.';
        }
      }
    }
    addCheck('seat-map', 'Sơ đồ khu vực', seatMapValid, seatMapMessage, seatMapMessage);

    addCheck(
      'artist-bio',
      'Artist Bio',
      concert.artistBios.length > 0,
      'Đã có Artist Bio được publish.',
      'Chưa có Artist Bio được publish; mục này không chặn concert.',
      false
    );
    addCheck(
      'checkin-staff',
      'Nhân viên soát vé',
      concert.staffAssignments.length > 0,
      `Đã phân công ${concert.staffAssignments.length} vị trí soát vé.`,
      'Chưa phân công nhân viên soát vé; mục này không chặn concert.',
      false
    );

    const blockingIssues = checks
      .filter((check) => check.blocking && check.status === 'FAIL')
      .map((check) => `${check.label}: ${check.message}`);
    return { concertId, ready: blockingIssues.length === 0, checks, blockingIssues };
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

  private validateTicketTypeInput(input: TicketTypeInput, concert: { saleOpenAt: Date; startAt: Date }) {
    if (input.price < 0 || input.totalQuantity < 0 || input.maxPerAccount <= 0) {
      throw new AppError(400, 'TICKET_QUANTITY_INVALID', 'Ticket quantities and price are invalid.');
    }
    this.validateTicketSaleWindow(
      input.saleOpenAt ? new Date(input.saleOpenAt) : null,
      input.saleCloseAt ? new Date(input.saleCloseAt) : null,
      concert
    );
  }

  private validateTicketSaleWindow(
    saleOpenAt: Date | null,
    saleCloseAt: Date | null,
    concert: { saleOpenAt: Date; startAt: Date }
  ) {
    const effectiveOpenAt = saleOpenAt || concert.saleOpenAt;
    const effectiveCloseAt = saleCloseAt || concert.startAt;
    if (!Number.isFinite(effectiveOpenAt.getTime()) || !Number.isFinite(effectiveCloseAt.getTime())) {
      throw new AppError(400, 'SALE_TIME_INVALID', 'Thời gian bán vé không hợp lệ.');
    }
    if (effectiveOpenAt < concert.saleOpenAt) {
      throw new AppError(400, 'SALE_TIME_INVALID', 'Loại vé không được mở bán trước concert.');
    }
    if (effectiveOpenAt >= effectiveCloseAt || effectiveCloseAt > concert.startAt) {
      throw new AppError(400, 'SALE_TIME_INVALID', 'Cửa sổ bán vé phải kết thúc không sau thời gian biểu diễn.');
    }
  }

  private async assertEventCodeAvailable(eventCode: string, excludeConcertId?: string) {
    const existing = await prisma.concert.findFirst({
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

  private async assertTicketTypeIdentityAvailable(
    concertId: string,
    name: string,
    zoneCode: string,
    excludeTicketTypeId?: string
  ) {
    const existing = await prisma.ticketType.findFirst({
      where: {
        concertId,
        ...(excludeTicketTypeId ? { id: { not: excludeTicketTypeId } } : {}),
        OR: [
          { name: { equals: name.trim(), mode: 'insensitive' } },
          { zoneCode: assertZoneCode(zoneCode) },
        ],
      },
      select: { name: true, zoneCode: true },
    });
    if (existing) {
      throw new AppError(
        409,
        'TICKET_TYPE_IDENTITY_EXISTS',
        `Tên loại vé hoặc mã khu vực đã tồn tại (${existing.name} / ${existing.zoneCode}).`
      );
    }
  }

  private assertDraft(status: string) {
    if (status !== 'DRAFT') {
      throw new AppError(409, 'CONCERT_CONFIG_LOCKED', 'Chỉ được thay đổi cấu hình này khi concert ở trạng thái DRAFT.');
    }
  }

  private deriveInventory(ticketType: {
    id: string;
    totalQuantity: number;
    reservedQuantity: number;
    soldQuantity: number;
  }) {
    return {
      ticketTypeId: ticketType.id,
      totalQuantity: ticketType.totalQuantity,
      availableQuantity: ticketType.totalQuantity - ticketType.reservedQuantity - ticketType.soldQuantity,
      reservedQuantity: ticketType.reservedQuantity,
      soldQuantity: ticketType.soldQuantity,
    };
  }
}

export const adminService = new AdminService();
