import { NextFunction, Request, Response } from 'express';
import { z } from 'zod';
import { adminService } from './admin.service';
import { AppError } from '../../shared/lib/errors';

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
  status: z.string().optional(),
});

export class AdminController {
  public async listConcerts(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await adminService.listConcerts(req.user!);
      return res.status(200).json({ success: true, data: result });
    } catch (error) {
      return next(error);
    }
  }

  public async getConcert(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await adminService.getConcert(req.user!, req.params.id);
      return res.status(200).json({ success: true, data: result });
    } catch (error) {
      return next(error);
    }
  }

  public async createConcert(req: Request, res: Response, next: NextFunction) {
    try {
      const dto = concertCreateSchema.parse(req.body);
      const result = await adminService.createConcert(req.user!, dto);
      return res.status(201).json({ success: true, data: result });
    } catch (error) {
      return next(error);
    }
  }

  public async updateConcert(req: Request, res: Response, next: NextFunction) {
    try {
      const dto = concertUpdateSchema.parse(req.body);
      const result = await adminService.updateConcert(req.user!, req.params.id, dto);
      return res.status(200).json({ success: true, data: result });
    } catch (error) {
      return next(error);
    }
  }

  public async publishConcert(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await adminService.publishConcert(req.user!, req.params.id);
      return res.status(200).json({ success: true, data: result });
    } catch (error) {
      return next(error);
    }
  }

  public async getConcertReadiness(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await adminService.getConcertReadiness(req.user!, req.params.id);
      return res.status(200).json({ success: true, data: result });
    } catch (error) {
      return next(error);
    }
  }

  public async listConcertArtists(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await adminService.listConcertArtists(req.user!, req.params.id);
      return res.status(200).json({ success: true, data: result });
    } catch (error) {
      return next(error);
    }
  }

  public async addConcertArtist(req: Request, res: Response, next: NextFunction) {
    try {
      const dto = artistSchema.parse(req.body);
      const result = await adminService.addConcertArtist(req.user!, req.params.id, dto.name);
      return res.status(201).json({ success: true, data: result });
    } catch (error) {
      return next(error);
    }
  }

  public async removeConcertArtist(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await adminService.removeConcertArtist(req.user!, req.params.id, req.params.artistId);
      return res.status(200).json({ success: true, data: result });
    } catch (error) {
      return next(error);
    }
  }

  public async uploadSeatMap(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.file) {
        throw new AppError(400, 'SEAT_MAP_FILE_REQUIRED', 'Vui lòng chọn file SVG.');
      }
      const result = await adminService.uploadSeatMap(req.user!, req.params.id, req.file);
      return res.status(200).json({ success: true, data: result });
    } catch (error) {
      return next(error);
    }
  }

  public async deleteSeatMap(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await adminService.deleteSeatMap(req.user!, req.params.id);
      return res.status(200).json({ success: true, data: result });
    } catch (error) {
      return next(error);
    }
  }

  public async cancelConcert(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await adminService.cancelConcert(req.user!, req.params.id, req.body?.reason);
      return res.status(200).json({ success: true, data: result });
    } catch (error) {
      return next(error);
    }
  }

  public async listTicketTypes(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await adminService.listTicketTypes(req.user!, req.params.concertId);
      return res.status(200).json({ success: true, data: result });
    } catch (error) {
      return next(error);
    }
  }

  public async createTicketType(req: Request, res: Response, next: NextFunction) {
    try {
      const dto = ticketTypeSchema.parse(req.body);
      const result = await adminService.createTicketType(req.user!, req.params.concertId, dto);
      return res.status(201).json({ success: true, data: result });
    } catch (error) {
      return next(error);
    }
  }

  public async updateTicketType(req: Request, res: Response, next: NextFunction) {
    try {
      const dto = ticketTypeUpdateSchema.parse(req.body);
      const result = await adminService.updateTicketType(req.user!, req.params.id, dto);
      return res.status(200).json({ success: true, data: result });
    } catch (error) {
      return next(error);
    }
  }

  public async deleteTicketType(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await adminService.deleteTicketType(req.user!, req.params.id);
      return res.status(200).json({ success: true, data: result });
    } catch (error) {
      return next(error);
    }
  }

  public async getInventory(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await adminService.getInventory(req.user!, req.params.id);
      return res.status(200).json({ success: true, data: result });
    } catch (error) {
      return next(error);
    }
  }

  public async updateInventory(req: Request, res: Response, next: NextFunction) {
    try {
      const dto = inventorySchema.parse(req.body);
      const result = await adminService.updateInventory(req.user!, req.params.id, dto.totalQuantity);
      return res.status(200).json({ success: true, data: result });
    } catch (error) {
      return next(error);
    }
  }

  public async listStaffAssignments(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await adminService.listStaffAssignments(req.user!, req.params.concertId);
      return res.status(200).json({ success: true, data: result });
    } catch (error) {
      return next(error);
    }
  }

  public async createStaffAssignment(req: Request, res: Response, next: NextFunction) {
    try {
      const dto = staffAssignmentSchema.parse(req.body);
      const result = await adminService.createStaffAssignment(req.user!, req.params.concertId, dto.staffId, dto.gateId);
      return res.status(201).json({ success: true, data: result });
    } catch (error) {
      return next(error);
    }
  }

  public async deleteStaffAssignment(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await adminService.deleteStaffAssignment(req.user!, req.params.id);
      return res.status(200).json({ success: true, data: result });
    } catch (error) {
      return next(error);
    }
  }

  public async listWhitelistConfigs(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await adminService.listWhitelistConfigs(req.user!);
      return res.status(200).json({ success: true, data: result });
    } catch (error) {
      return next(error);
    }
  }

  public async listActiveWhitelistConfigs(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await adminService.listActiveWhitelistConfigs();
      return res.status(200).json({ success: true, data: result });
    } catch (error) {
      return next(error);
    }
  }

  public async createWhitelistConfig(req: Request, res: Response, next: NextFunction) {
    try {
      const dto = whitelistSchema.parse(req.body);
      const result = await adminService.createWhitelistConfig(req.user!, dto);
      return res.status(201).json({ success: true, data: result });
    } catch (error) {
      return next(error);
    }
  }

  public async updateWhitelistConfig(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await adminService.updateWhitelistConfig(req.user!, req.params.id, req.body);
      return res.status(200).json({ success: true, data: result });
    } catch (error) {
      return next(error);
    }
  }

  public async deleteWhitelistConfig(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await adminService.deleteWhitelistConfig(req.user!, req.params.id);
      return res.status(200).json({ success: true, data: result });
    } catch (error) {
      return next(error);
    }
  }

  public async revenueSummary(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await adminService.revenueSummary(req.user!, req.params.id);
      return res.status(200).json({ success: true, data: result });
    } catch (error) {
      return next(error);
    }
  }

  public async listStaffUsers(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await adminService.listStaffUsers(req.user!);
      return res.status(200).json({ success: true, data: result });
    } catch (error) {
      return next(error);
    }
  }

  public async createStaffUser(req: Request, res: Response, next: NextFunction) {
    try {
      const dto = staffCreateSchema.parse(req.body);
      const result = await adminService.createStaffUser(req.user!, dto);
      return res.status(201).json({ success: true, data: result });
    } catch (error) {
      return next(error);
    }
  }
}
