import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards, UseInterceptors, UploadedFile } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import multer from 'multer';
import { z } from 'zod';
import { AdminService } from './admin.service';
import { AppError } from '../../shared/lib/errors';
import { AuthGuard } from '../../shared/guards/auth.guard';
import { RolesGuard } from '../../shared/guards/roles.guard';
import { Roles } from '../../shared/decorators/roles.decorator';
import { CurrentUser } from '../../shared/decorators/current-user.decorator';
import { AuthUser } from '../../shared/types/auth';
import { MAX_SEAT_MAP_SIZE } from '../../shared/lib/seat-map-svg';

const isoDateTime = z.string().datetime({ offset: true });
const zoneCode = z.string().trim().min(1).max(32).regex(/^[A-Za-z0-9][A-Za-z0-9_-]*$/);

const concertCreateSchema = z.object({
  eventCode: z.string().trim().min(1).max(64),
  name: z.string().trim().min(1).max(200),
  venue: z.string().trim().min(1).max(300),
  startAt: isoDateTime,
  saleOpenAt: isoDateTime,
  description: z.string().trim().max(5000).optional(),
  seatMapEnabled: z.boolean().optional().default(false),
  organizationId: z.string().uuid().optional(),
}).superRefine((value, context) => {
  if (new Date(value.saleOpenAt) >= new Date(value.startAt)) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['saleOpenAt'], message: 'Thời gian mở bán phải trước thời gian biểu diễn.' });
  }
});

const ticketTypeSchema = z.object({
  name: z.string().trim().min(1).max(100),
  zoneCode,
  price: z.coerce.number().nonnegative(),
  totalQuantity: z.coerce.number().int().nonnegative(),
  maxPerAccount: z.coerce.number().int().positive(),
  saleOpenAt: isoDateTime.optional(),
  saleCloseAt: isoDateTime.optional(),
}).superRefine((value, context) => {
  if (value.saleOpenAt && value.saleCloseAt && new Date(value.saleOpenAt) >= new Date(value.saleCloseAt)) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['saleCloseAt'], message: 'Thời gian đóng bán phải sau thời gian mở bán.' });
  }
});

const concertUpdateSchema = z.object({
  eventCode: z.string().trim().min(1).max(64).optional(),
  name: z.string().trim().min(1).max(200).optional(),
  venue: z.string().trim().min(1).max(300).optional(),
  startAt: isoDateTime.optional(),
  saleOpenAt: isoDateTime.optional(),
  description: z.string().trim().max(5000).optional(),
  seatMapEnabled: z.boolean().optional(),
}).strict();

const ticketTypeUpdateSchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  zoneCode: zoneCode.optional(),
  price: z.coerce.number().nonnegative().optional(),
  maxPerAccount: z.coerce.number().int().positive().optional(),
  saleOpenAt: isoDateTime.nullable().optional(),
  saleCloseAt: isoDateTime.nullable().optional(),
  status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
}).strict();

const artistSchema = z.object({ name: z.string().trim().min(1).max(200) });

const inventorySchema = z.object({
  totalQuantity: z.coerce.number().int(),
});

const staffAssignmentSchema = z.object({
  staffId: z.string().uuid(),
  gateId: z.string().min(1),
});

const staffCreateSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  fullName: z.string().min(1),
  phone: z.string().optional(),
});

const whitelistSchema = z.object({
  organizationId: z.string().uuid().optional(),
  concertId: z.string().uuid().optional(),
  mailboxAddress: z.string().min(3),
  allowedSenderEmail: z.string().min(3),
  subjectKeyword: z.string().min(1),
  status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
});

const whitelistUpdateSchema = whitelistSchema.partial().strict().refine((data) => Object.keys(data).length > 0, {
  message: 'At least one whitelist field is required.',
});

const cancelConcertSchema = z.object({
  reason: z.string().trim().max(1000).optional(),
}).default({});


@Controller('api/v1/admin')
@UseGuards(AuthGuard, RolesGuard)
@Roles('ORGANIZER')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('concerts')
  public async listConcerts(@CurrentUser() user: AuthUser) {
    const result = await this.adminService.listConcerts(user);
    return { success: true, data: result };
  }

  @Get('concerts/:id')
  public async getConcert(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    const result = await this.adminService.getConcert(user, id);
    return { success: true, data: result };
  }

  @Post('concerts')
  public async createConcert(@CurrentUser() user: AuthUser, @Body() body: unknown) {
    const dto = concertCreateSchema.parse(body);
    const result = await this.adminService.createConcert(user, dto);
    return { success: true, data: result };
  }

  @Patch('concerts/:id')
  public async updateConcert(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() body: unknown) {
    const dto = concertUpdateSchema.parse(body);
    const result = await this.adminService.updateConcert(user, id, dto);
    return { success: true, data: result };
  }

  @Post('concerts/:id/publish')
  public async publishConcert(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    const result = await this.adminService.publishConcert(user, id);
    return { success: true, data: result };
  }

  @Get('concerts/:id/readiness')
  public async getConcertReadiness(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    const result = await this.adminService.getConcertReadiness(user, id);
    return { success: true, data: result };
  }

  @Get('concerts/:id/artists')
  public async listConcertArtists(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    const result = await this.adminService.listConcertArtists(user, id);
    return { success: true, data: result };
  }

  @Post('concerts/:id/artists')
  public async addConcertArtist(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() body: unknown) {
    const dto = artistSchema.parse(body);
    const result = await this.adminService.addConcertArtist(user, id, dto.name);
    return { success: true, data: result };
  }

  @Delete('concerts/:id/artists/:artistId')
  public async removeConcertArtist(@CurrentUser() user: AuthUser, @Param('id') id: string, @Param('artistId') artistId: string) {
    const result = await this.adminService.removeConcertArtist(user, id, artistId);
    return { success: true, data: result };
  }

  @Post('concerts/:id/seat-map')
  @UseInterceptors(FileInterceptor('file', {
    storage: multer.memoryStorage(),
    limits: { fileSize: MAX_SEAT_MAP_SIZE },
    fileFilter: (_req: Express.Request, file: Express.Multer.File, callback: (error: Error | null, acceptFile: boolean) => void) => {
      const isSvg = file.mimetype === 'image/svg+xml' || file.originalname.toLowerCase().endsWith('.svg');
      if (isSvg) { callback(null, true); return; }
      callback(new AppError(400, 'SEAT_MAP_FILE_TYPE_INVALID', 'Chỉ chấp nhận file SVG.'), false);
    },
  }))
  public async uploadSeatMap(@CurrentUser() user: AuthUser, @Param('id') id: string, @UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new AppError(400, 'SEAT_MAP_FILE_REQUIRED', 'Vui lòng chọn file SVG.');
    }
    const result = await this.adminService.uploadSeatMap(user, id, file);
    return { success: true, data: result };
  }

  @Delete('concerts/:id/seat-map')
  public async deleteSeatMap(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    const result = await this.adminService.deleteSeatMap(user, id);
    return { success: true, data: result };
  }

  @Post('concerts/:id/cancel')
  public async cancelConcert(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() body: unknown) {
    const dto = cancelConcertSchema.parse(body);
    const result = await this.adminService.cancelConcert(user, id, dto.reason);
    return { success: true, data: result };
  }

  @Get('concerts/:concertId/ticket-types')
  public async listTicketTypes(@CurrentUser() user: AuthUser, @Param('concertId') concertId: string) {
    const result = await this.adminService.listTicketTypes(user, concertId);
    return { success: true, data: result };
  }

  @Post('concerts/:concertId/ticket-types')
  public async createTicketType(@CurrentUser() user: AuthUser, @Param('concertId') concertId: string, @Body() body: unknown) {
    const dto = ticketTypeSchema.parse(body);
    const result = await this.adminService.createTicketType(user, concertId, dto);
    return { success: true, data: result };
  }

  @Patch('ticket-types/:id')
  public async updateTicketType(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() body: unknown) {
    const dto = ticketTypeUpdateSchema.parse(body);
    const result = await this.adminService.updateTicketType(user, id, dto);
    return { success: true, data: result };
  }

  @Delete('ticket-types/:id')
  public async deleteTicketType(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    const result = await this.adminService.deleteTicketType(user, id);
    return { success: true, data: result };
  }

  @Get('ticket-types/:id/inventory')
  public async getInventory(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    const result = await this.adminService.getInventory(user, id);
    return { success: true, data: result };
  }

  @Patch('ticket-types/:id/inventory')
  public async updateInventory(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() body: unknown) {
    const dto = inventorySchema.parse(body);
    const result = await this.adminService.updateInventory(user, id, dto.totalQuantity);
    return { success: true, data: result };
  }

  @Get('concerts/:concertId/staff-assignments')
  public async listStaffAssignments(@CurrentUser() user: AuthUser, @Param('concertId') concertId: string) {
    const result = await this.adminService.listStaffAssignments(user, concertId);
    return { success: true, data: result };
  }

  @Post('concerts/:concertId/staff-assignments')
  public async createStaffAssignment(@CurrentUser() user: AuthUser, @Param('concertId') concertId: string, @Body() body: unknown) {
    const dto = staffAssignmentSchema.parse(body);
    const result = await this.adminService.createStaffAssignment(user, concertId, dto.staffId, dto.gateId);
    return { success: true, data: result };
  }

  @Delete('staff-assignments/:id')
  public async deleteStaffAssignment(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    const result = await this.adminService.deleteStaffAssignment(user, id);
    return { success: true, data: result };
  }

  @Get('whitelist-email-configs')
  public async listWhitelistConfigs(@CurrentUser() user: AuthUser) {
    const result = await this.adminService.listWhitelistConfigs(user);
    return { success: true, data: result };
  }

  @Post('whitelist-email-configs')
  public async createWhitelistConfig(@CurrentUser() user: AuthUser, @Body() body: unknown) {
    const dto = whitelistSchema.parse(body);
    const result = await this.adminService.createWhitelistConfig(user, dto);
    return { success: true, data: result };
  }

  @Patch('whitelist-email-configs/:id')
  public async updateWhitelistConfig(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() body: unknown) {
    const dto = whitelistUpdateSchema.parse(body);
    const result = await this.adminService.updateWhitelistConfig(user, id, dto);
    return { success: true, data: result };
  }

  @Delete('whitelist-email-configs/:id')
  public async deleteWhitelistConfig(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    const result = await this.adminService.deleteWhitelistConfig(user, id);
    return { success: true, data: result };
  }

  @Get('concerts/:id/revenue-summary')
  public async revenueSummary(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    const result = await this.adminService.revenueSummary(user, id);
    return { success: true, data: result };
  }

  @Get('concerts/:id/sales-stats')
  public async salesStats(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    const result = await this.adminService.revenueSummary(user, id);
    return { success: true, data: result };
  }

  @Get('staff')
  public async listStaffUsers(@CurrentUser() user: AuthUser) {
    const result = await this.adminService.listStaffUsers(user);
    return { success: true, data: result };
  }

  @Post('staff')
  public async createStaffUser(@CurrentUser() user: AuthUser, @Body() body: unknown) {
    const dto = staffCreateSchema.parse(body);
    const result = await this.adminService.createStaffUser(user, dto);
    return { success: true, data: result };
  }
}
