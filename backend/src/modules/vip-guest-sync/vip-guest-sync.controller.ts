import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { VipGuestSyncService } from './vip-guest-sync.service';

const vipGuestSyncService = new VipGuestSyncService();

const sponsorSchema = z.object({
  email: z.string().email(),
  displayName: z.string().optional(),
  allowedEventCodes: z.array(z.string()).optional(),
});

const updateSponsorSchema = z.object({
  displayName: z.string().optional(),
  isActive: z.boolean().optional(),
  allowedEventCodes: z.array(z.string()).optional(),
});

export class VipGuestSyncController {
  public async listSponsorEmails(req: Request, res: Response, next: NextFunction) {
    try {
      const sponsors = await vipGuestSyncService.listSponsorEmails();
      return res.status(200).json({ success: true, data: sponsors });
    } catch (err) {
      next(err);
    }
  }

  public async createSponsorEmail(req: Request, res: Response, next: NextFunction) {
    try {
      const body = sponsorSchema.parse(req.body);
      const sponsor = await vipGuestSyncService.createSponsorEmail(body);
      return res.status(201).json({ success: true, data: sponsor });
    } catch (err) {
      next(err);
    }
  }

  public async updateSponsorEmail(req: Request, res: Response, next: NextFunction) {
    try {
      const body = updateSponsorSchema.parse(req.body);
      const sponsor = await vipGuestSyncService.updateSponsorEmail(req.params.id, body);
      return res.status(200).json({ success: true, data: sponsor });
    } catch (err) {
      next(err);
    }
  }

  public async listImportReports(req: Request, res: Response, next: NextFunction) {
    try {
      const reports = await vipGuestSyncService.listImportReports();
      return res.status(200).json({ success: true, data: reports });
    } catch (err) {
      next(err);
    }
  }

  public async getImportReport(req: Request, res: Response, next: NextFunction) {
    try {
      const report = await vipGuestSyncService.getImportReport(req.params.id);
      return res.status(200).json({ success: true, data: report });
    } catch (err) {
      next(err);
    }
  }
}
