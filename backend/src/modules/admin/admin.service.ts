import bcrypt from 'bcryptjs';
import { prisma } from '../../shared/lib/prisma';
import { AppError } from '../../shared/lib/errors';
import { AuthUser } from '../../shared/types/auth';
import { authorizationService } from '../rbac/authorization.service';
import { normalizeRole } from '../rbac/roles';
import { publishConcertListingInvalidation } from '../concert/concert-listing-events';

const PAID_STATUSES = ['paid', 'PAID'];
const ACTIVE_CONCERT_STATUSES = ['DRAFT', 'PUBLISHED', 'ON_SALE', 'SALE_CLOSED', 'COMPLETED', 'CANCELLED'];

export class AdminService {
  public async listConcerts(user: AuthUser) {
    return prisma.concert.findMany({
      where: this.concertScope(user),
      include: {
        ticketTypes: { include: { inventory: true } },
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
    svgSeatingMap?: string;
    organizationId?: string;
  }) {
    const organizationId = this.resolveWritableOrganization(user, input.organizationId);

    const concert = await prisma.concert.create({
      data: {
        organizerId: user.id,
        organizationId,
        eventCode: input.eventCode.trim().toUpperCase(),
        name: input.name,
        venue: input.venue,
        startAt: new Date(input.startAt),
        saleOpenAt: new Date(input.saleOpenAt),
        status: 'DRAFT',
        description: input.description,
        svgSeatingMap: input.svgSeatingMap,
      },
    });

    await publishConcertListingInvalidation('concert.created', { concertId: concert.id });
    return concert;
  }

  public async updateConcert(user: AuthUser, concertId: string, input: Record<string, unknown>) {
    await this.assertCanManageConcert(user, concertId);

    const data: Record<string, unknown> = {};
    for (const field of ['name', 'venue', 'description', 'svgSeatingMap'] as const) {
      if (typeof input[field] === 'string') {
        data[field] = input[field];
      }
    }
    if (typeof input.eventCode === 'string' && input.eventCode.trim()) {
      data.eventCode = input.eventCode.trim().toUpperCase();
    }
    if (typeof input.startAt === 'string') data.startAt = new Date(input.startAt);
    if (typeof input.saleOpenAt === 'string') data.saleOpenAt = new Date(input.saleOpenAt);

    const concert = await prisma.concert.update({ where: { id: concertId }, data });
    await publishConcertListingInvalidation('concert.updated', { concertId });
    return concert;
  }

  public async publishConcert(user: AuthUser, concertId: string) {
    const concert = await this.assertCanManageConcert(user, concertId);
    if (!['DRAFT', 'draft', 'PUBLISHED', 'published'].includes(concert.status)) {
      throw new AppError(400, 'CONCERT_INVALID_STATUS_TRANSITION', 'Concert cannot be published from current status.');
    }
    const updated = await prisma.concert.update({ where: { id: concertId }, data: { status: 'PUBLISHED' } });
    await publishConcertListingInvalidation('concert.published', { concertId });
    return updated;
  }

  public async cancelConcert(user: AuthUser, concertId: string, reason?: string) {
    await this.assertCanManageConcert(user, concertId);
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

  public async createTicketType(user: AuthUser, concertId: string, input: {
    name: string;
    price: number;
    totalQuantity: number;
    maxPerAccount: number;
    saleOpenAt?: string;
    saleCloseAt?: string;
  }) {
    await this.assertCanManageConcert(user, concertId);
    this.validateTicketTypeInput(input);

    const ticketType = await prisma.$transaction(async (tx) => {
      const ticketType = await tx.ticketType.create({
        data: {
          concertId,
          name: input.name,
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

  public async updateTicketType(user: AuthUser, ticketTypeId: string, input: Record<string, unknown>) {
    const ticketType = await prisma.ticketType.findUnique({ where: { id: ticketTypeId } });
    if (!ticketType) throw new AppError(404, 'TICKET_TYPE_NOT_FOUND', 'Ticket type not found.');
    await this.assertCanManageConcert(user, ticketType.concertId);

    const data: Record<string, unknown> = {};
    if (typeof input.name === 'string') data.name = input.name;
    if (typeof input.price === 'number') {
      if (input.price < 0) throw new AppError(400, 'TICKET_QUANTITY_INVALID', 'Price must be non-negative.');
      data.price = input.price;
    }
    if (typeof input.maxPerAccount === 'number') {
      if (input.maxPerAccount <= 0) throw new AppError(400, 'TICKET_QUANTITY_INVALID', 'maxPerAccount must be positive.');
      data.maxPerAccount = input.maxPerAccount;
    }
    if (typeof input.saleOpenAt === 'string') data.saleOpenAt = new Date(input.saleOpenAt);
    if (typeof input.saleCloseAt === 'string') data.saleCloseAt = new Date(input.saleCloseAt);
    if (typeof input.status === 'string') data.status = input.status;

    const saleOpenAt = data.saleOpenAt instanceof Date ? data.saleOpenAt : ticketType.saleOpenAt;
    const saleCloseAt = data.saleCloseAt instanceof Date ? data.saleCloseAt : ticketType.saleCloseAt;
    if (saleOpenAt && saleCloseAt && saleOpenAt >= saleCloseAt) {
      throw new AppError(400, 'SALE_TIME_INVALID', 'saleOpenAt must be before saleCloseAt.');
    }

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
    await this.assertCanManageConcert(user, ticketType.concertId);

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

  private validateTicketTypeInput(input: {
    price: number;
    totalQuantity: number;
    maxPerAccount: number;
    saleOpenAt?: string;
    saleCloseAt?: string;
  }) {
    if (input.price < 0 || input.totalQuantity < 0 || input.maxPerAccount <= 0) {
      throw new AppError(400, 'TICKET_QUANTITY_INVALID', 'Ticket quantities and price are invalid.');
    }
    if (input.saleOpenAt && input.saleCloseAt && new Date(input.saleOpenAt) >= new Date(input.saleCloseAt)) {
      throw new AppError(400, 'SALE_TIME_INVALID', 'saleOpenAt must be before saleCloseAt.');
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
