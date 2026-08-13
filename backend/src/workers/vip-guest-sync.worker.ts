import { Worker, Job } from 'bullmq';
import cron from 'node-cron';
import { queueConnection } from '../shared/lib/queue';
import { getVipGuestImportQueue } from '../shared/lib/job-queues';
import { fetchCsvAttachmentsFromMailbox, ImapMailboxUnavailableError } from '../shared/lib/imap';
import { VipGuestSyncService } from '../modules/vip-guest-sync/vip-guest-sync.service';
import { prisma } from '../shared/lib/prisma';
import { PrismaService } from '../shared/modules/prisma.service';

const vipGuestSyncService = new VipGuestSyncService(prisma as unknown as PrismaService);
let vipGuestImportWorker: Worker | null = null;
let isPollingMailbox = false;
let cronScheduled = false;

async function processVipGuestImport(job: Job<{ importJobId: string }>) {
  await vipGuestSyncService.processImportJob(job.data.importJobId);
}

export async function pollSponsorMailbox(): Promise<void> {
  if (isPollingMailbox) {
    console.warn('[VipGuestSyncWorker] Previous mailbox poll is still running. Skipping this tick.');
    return;
  }

  isPollingMailbox = true;
  let attachments;
  try {
    attachments = await fetchCsvAttachmentsFromMailbox();
  } catch (error) {
    if (error instanceof ImapMailboxUnavailableError) {
      await vipGuestSyncService.createMailboxErrorReport(error.message);
      return;
    }
    throw error;
  } finally {
    isPollingMailbox = false;
  }

  let queuedCount = 0;
  for (const attachment of attachments) {
    const importJob = await vipGuestSyncService.createImportJobFromAttachment({
      senderEmail: attachment.senderEmail,
      messageId: attachment.messageId,
      fileName: attachment.fileName,
      content: attachment.content,
    });
    if (!importJob) continue;

    await getVipGuestImportQueue().add('importVipGuestCsv', { importJobId: importJob.id });
    queuedCount += 1;
  }

  if (queuedCount === 0) await vipGuestSyncService.createNoFileReport();
}

export function startVipGuestSyncWorker() {
  if (!vipGuestImportWorker) {
    vipGuestImportWorker = new Worker('vipGuestImportQueue', processVipGuestImport, {
      connection: queueConnection,
    });
    vipGuestImportWorker.on('failed', (job, error) => {
      console.error(`[VipGuestImportWorker] Job ${job?.id} failed:`, error);
    });
  }

  if (cronScheduled) return vipGuestImportWorker;

  const cronExpression = process.env.VIP_GUEST_IMPORT_CRON || '0 1 * * *';
  if (!cron.validate(cronExpression)) {
    console.warn(`[VipGuestSyncWorker] Invalid cron expression: ${cronExpression}`);
    return vipGuestImportWorker;
  }

  cron.schedule(cronExpression, () => {
    pollSponsorMailbox().catch((error) => {
      console.error('[VipGuestSyncWorker] Mailbox poll failed:', error);
    });
  });
  cronScheduled = true;
  console.log(`[VipGuestSyncWorker] Scheduled mailbox poll with cron ${cronExpression}`);
  return vipGuestImportWorker;
}
