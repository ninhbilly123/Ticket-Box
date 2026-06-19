import { NextFunction, Request, Response } from 'express';
import { z } from 'zod';
import { adminService } from './admin.service';

const concertCreateSchema = z.object({
  name: z.string().min(1),
  venue: z.string().min(1),
  startAt: z.string().datetime().or(z.string().min(1)),
  saleOpenAt: z.string().datetime().or(z.string().min(1)),
  description: z.string().optional(),
  svgSeatingMap: z.string().optional(),
  organizationId: z.string().uuid().optional(),
});

const ticketTypeSchema = z.object({
  name: z.string().min(1),
  price: z.coerce.number(),
  totalQuantity: z.coerce.number().int(),
  maxPerAccount: z.coerce.number().int(),
  saleOpenAt: z.string().optional(),
  saleCloseAt: z.string().optional(),
});

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
      const result = await adminService.updateConcert(req.user!, req.params.id, req.body);
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
      const result = await adminService.updateTicketType(req.user!, req.params.id, req.body);
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
