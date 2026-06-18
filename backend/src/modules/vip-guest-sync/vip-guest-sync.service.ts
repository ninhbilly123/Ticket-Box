import { parse } from 'csv-parse/sync';
import { Prisma } from '@prisma/client';
import { prisma } from '../../shared/lib/prisma';
import { AppError } from '../../shared/lib/errors';
import { generateVipGuestQrToken } from '../../shared/lib/crypto';
import {
  safeObjectName,
  uploadObject,
  getObjectBuffer,
  VIP_GUEST_IMPORT_BUCKET,
} from '../../shared/lib/storage';
import { emailQueue } from '../../workers/email.worker';

const REQUIRED_HEADERS = ['fullName', 'email', 'phone', 'company', 'eventCode', 'note'];

interface CsvGuestRow {
  fullName?: string;
  email?: string;
  phone?: string;
  company?: string;
  eventCode?: string;
  note?: string;
}

interface RowErrorInput {
  rowNumber: number;
  rawData: Prisma.InputJsonValue;
  errorCode: string;
  message: string;
}

export class VipGuestSyncService {
  public async createSponsorEmail(params: {
    email: string;
    displayName?: string;
    allowedEventCodes?: string[];
  }) {
    const email = params.email.trim().toLowerCase();
    if (!this.isValidEmail(email)) {
      throw new AppError(400, 'INVALID_EMAIL', 'Email nha tai tro khong hop le.');
    }

    return prisma.sponsorEmail.upsert({
      where: { email },
      update: {
        displayName: params.displayName,
        isActive: true,
        allowedEventCodes: params.allowedEventCodes || [],
      },
      create: {
        email,
        displayName: params.displayName,
        allowedEventCodes: params.allowedEventCodes || [],
      },
    });
  }

  public async updateSponsorEmail(
    id: string,
    params: { displayName?: string; isActive?: boolean; allowedEventCodes?: string[] }
  ) {
    return prisma.sponsorEmail.update({
      where: { id },
      data: {
        displayName: params.displayName,
        isActive: params.isActive,
        allowedEventCodes: params.allowedEventCodes,
      },
    });
  }

  public async listSponsorEmails() {
    return prisma.sponsorEmail.findMany({ orderBy: { createdAt: 'desc' } });
  }

  public async listImportReports() {
    return prisma.guestImportJob.findMany({
      orderBy: { createdAt: 'desc' },
      include: { rowErrors: true },
    });
  }

  public async getImportReport(id: string) {
    const report = await prisma.guestImportJob.findUnique({
      where: { id },
      include: { rowErrors: true, vipGuests: true },
    });
    if (!report) {
      throw new AppError(404, 'IMPORT_REPORT_NOT_FOUND', 'Khong tim thay bao cao import.');
    }
    return report;
  }

  public async createNoFileReport(): Promise<void> {
    await prisma.guestImportJob.create({
      data: {
        status: 'NO_FILE',
        errorMessage: 'Khong tim thay file CSV hop le trong mailbox vao thoi diem cron chay.',
        startedAt: new Date(),
        finishedAt: new Date(),
      },
    });
  }

  public async createImportJobFromAttachment(params: {
    senderEmail: string;
    messageId: string;
    fileName: string;
    content: Buffer;
  }) {
    const senderEmail = params.senderEmail.trim().toLowerCase();
    const sponsor = await prisma.sponsorEmail.findFirst({
      where: { email: senderEmail, isActive: true },
    });

    if (!sponsor) {
      await prisma.guestImportJob.create({
        data: {
          status: 'FAILED',
          senderEmail,
          mailboxMessageId: params.messageId,
          originalFileName: params.fileName,
          errorMessage: 'Sender khong nam trong sponsor email allowlist.',
          startedAt: new Date(),
          finishedAt: new Date(),
        },
      });
      return null;
    }

    const existing = await prisma.guestImportJob.findFirst({
      where: {
        mailboxMessageId: params.messageId,
        originalFileName: params.fileName,
      },
    });
    if (existing) {
      return null;
    }

    const objectKey = `vip-guest-imports/${Date.now()}-${safeObjectName(params.fileName)}`;
    await uploadObject({
      bucket: VIP_GUEST_IMPORT_BUCKET,
      key: objectKey,
      body: params.content,
      contentType: 'text/csv',
    });

    return prisma.guestImportJob.create({
      data: {
        status: 'PENDING',
        senderEmail,
        mailboxMessageId: params.messageId,
        originalFileName: params.fileName,
        objectKey,
      },
    });
  }

  public async processImportJob(importJobId: string) {
    const importJob = await prisma.guestImportJob.findUnique({ where: { id: importJobId } });
    if (!importJob || !importJob.objectKey) {
      throw new AppError(404, 'IMPORT_JOB_NOT_FOUND', 'Khong tim thay import job hoac file CSV.');
    }

    await prisma.guestImportJob.update({
      where: { id: importJobId },
      data: { status: 'PROCESSING', startedAt: new Date(), errorMessage: null },
    });

    try {
      const buffer = await getObjectBuffer(VIP_GUEST_IMPORT_BUCKET, importJob.objectKey);
      const csvText = buffer.toString('utf8').replace(/^\uFEFF/, '');
      this.assertRequiredHeaders(csvText);
      const rows = parse(csvText, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
      }) as CsvGuestRow[];

      if (rows.length === 0) {
        throw new AppError(400, 'EMPTY_CSV', 'File CSV khong co dong du lieu hop le.');
      }

      const sponsor = importJob.senderEmail
        ? await prisma.sponsorEmail.findFirst({
            where: { email: importJob.senderEmail.toLowerCase(), isActive: true },
          })
        : null;

      let successRows = 0;
      let duplicateRows = 0;
      let emailQueuedRows = 0;
      const rowErrors: RowErrorInput[] = [];

      for (let index = 0; index < rows.length; index += 1) {
        const row = this.normalizeRow(rows[index]);
        const rowNumber = index + 2;
        const rowError = await this.validateRow(row, rowNumber, sponsor?.allowedEventCodes || []);
        if (rowError) {
          rowErrors.push(rowError);
          continue;
        }

        const concert = await prisma.concert.findUnique({
          where: { eventCode: row.eventCode as string },
        });
        if (!concert) {
          rowErrors.push({
            rowNumber,
            rawData: this.toJson(row),
            errorCode: 'EVENT_CODE_NOT_FOUND',
            message: `Khong tim thay concert voi eventCode ${row.eventCode}.`,
          });
          continue;
        }

        const existingGuest = await prisma.vipGuest.findFirst({
          where: {
            concertId: concert.id,
            OR: [
              ...(row.email ? [{ email: row.email }] : []),
              ...(row.phone ? [{ phone: row.phone }] : []),
            ],
          },
        });

        if (existingGuest) {
          duplicateRows += 1;
          continue;
        }

        const guest = await prisma.vipGuest.create({
          data: {
            concertId: concert.id,
            fullName: row.fullName as string,
            email: row.email || null,
            phone: row.phone || null,
            company: row.company || null,
            note: row.note || null,
            sourceImportId: importJobId,
            emailStatus: row.email ? 'QUEUED' : 'SKIPPED',
          },
        });

        const qrToken = generateVipGuestQrToken(guest.id);
        await prisma.vipGuest.update({ where: { id: guest.id }, data: { qrToken } });

        if (row.email) {
          await emailQueue.add('sendVipGuestTicketEmail', {
            vipGuestId: guest.id,
            importJobId,
          });
          emailQueuedRows += 1;
        }

        successRows += 1;
      }

      if (rowErrors.length > 0) {
        await prisma.guestImportRowError.createMany({
          data: rowErrors.map((error) => ({
            guestImportJobId: importJobId,
            rowNumber: error.rowNumber,
            rawData: error.rawData,
            errorCode: error.errorCode,
            message: error.message,
          })),
        });
      }

      const errorRows = rowErrors.length;
      const status =
        successRows === 0 && duplicateRows === 0 && errorRows > 0
          ? 'FAILED'
          : errorRows > 0 || duplicateRows > 0
            ? 'PARTIAL_SUCCESS'
            : 'SUCCESS';

      return prisma.guestImportJob.update({
        where: { id: importJobId },
        data: {
          status,
          totalRows: rows.length,
          successRows,
          duplicateRows,
          errorRows,
          emailSentRows: 0,
          finishedAt: new Date(),
          errorMessage: status === 'FAILED' ? 'Khong co dong nao duoc import thanh cong.' : null,
        },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'CSV import failed';
      return prisma.guestImportJob.update({
        where: { id: importJobId },
        data: {
          status: 'FAILED',
          errorMessage: message,
          finishedAt: new Date(),
        },
      });
    }
  }

  private assertRequiredHeaders(csvText: string): void {
    const firstLine = csvText.split(/\r?\n/).find((line) => line.trim().length > 0);
    if (!firstLine) {
      throw new AppError(400, 'EMPTY_CSV', 'File CSV rong.');
    }

    const headers = firstLine.split(',').map((header) => header.trim().replace(/^"|"$/g, ''));
    const missingHeaders = REQUIRED_HEADERS.filter((header) => !headers.includes(header));
    if (missingHeaders.length > 0) {
      throw new AppError(
        400,
        'INVALID_CSV_HEADER',
        `File CSV thieu header bat buoc: ${missingHeaders.join(', ')}.`
      );
    }
  }

  private normalizeRow(row: CsvGuestRow): CsvGuestRow {
    return {
      fullName: row.fullName?.trim(),
      email: row.email?.trim().toLowerCase(),
      phone: row.phone?.trim(),
      company: row.company?.trim(),
      eventCode: row.eventCode?.trim(),
      note: row.note?.trim(),
    };
  }

  private async validateRow(
    row: CsvGuestRow,
    rowNumber: number,
    allowedEventCodes: string[]
  ): Promise<RowErrorInput | null> {
    if (!row.fullName) {
      return this.rowError(rowNumber, row, 'FULL_NAME_REQUIRED', 'Dong CSV thieu fullName.');
    }
    if (!row.email && !row.phone) {
      return this.rowError(
        rowNumber,
        row,
        'CONTACT_REQUIRED',
        'Dong CSV can co it nhat email hoac phone.'
      );
    }
    if (row.email && !this.isValidEmail(row.email)) {
      return this.rowError(rowNumber, row, 'INVALID_EMAIL', 'Email khach moi khong hop le.');
    }
    if (!row.eventCode) {
      return this.rowError(rowNumber, row, 'EVENT_CODE_REQUIRED', 'Dong CSV thieu eventCode.');
    }
    if (allowedEventCodes.length > 0 && !allowedEventCodes.includes(row.eventCode)) {
      return this.rowError(
        rowNumber,
        row,
        'SPONSOR_EVENT_NOT_ALLOWED',
        `Sponsor khong duoc phep gui danh sach cho eventCode ${row.eventCode}.`
      );
    }
    return null;
  }

  private rowError(
    rowNumber: number,
    row: CsvGuestRow,
    errorCode: string,
    message: string
  ): RowErrorInput {
    return {
      rowNumber,
      rawData: this.toJson(row),
      errorCode,
      message,
    };
  }

  private toJson(row: CsvGuestRow): Prisma.InputJsonValue {
    return {
      fullName: row.fullName || null,
      email: row.email || null,
      phone: row.phone || null,
      company: row.company || null,
      eventCode: row.eventCode || null,
      note: row.note || null,
    };
  }

  private isValidEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }
}
