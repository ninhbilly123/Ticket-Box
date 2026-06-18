import { Queue, Worker, Job } from 'bullmq';
import cron from 'node-cron';
import { queueConnection } from '../shared/lib/queue';
import { fetchCsvAttachmentsFromMailbox } from '../shared/lib/imap';
import { VipGuestSyncService } from '../modules/vip-guest-sync/vip-guest-sync.service';

const vipGuestSyncService = new VipGuestSyncService();

export const vipGuestImportQueue = new Queue('vipGuestImportQueue', {
  connection: queueConnection,
});

export const vipGuestImportWorker = new Worker(
  'vipGuestImportQueue',
  async (job: Job<{ importJobId: string }>) => {
    await vipGuestSyncService.processImportJob(job.data.importJobId);
  },
  { connection: queueConnection }
);

vipGuestImportWorker.on('failed', (job, err) => {
  console.error(`[VipGuestImportWorker] Job ${job?.id} failed:`, err);
});

export async function pollSponsorMailbox(): Promise<void> {
  const attachments = await fetchCsvAttachmentsFromMailbox();
  let queuedCount = 0;

  for (const attachment of attachments) {
    const importJob = await vipGuestSyncService.createImportJobFromAttachment({
      senderEmail: attachment.senderEmail,
      messageId: attachment.messageId,
      fileName: attachment.fileName,
      content: attachment.content,
    });

    if (!importJob) {
      continue;
    }

    await vipGuestImportQueue.add('importVipGuestCsv', { importJobId: importJob.id });
    queuedCount += 1;
  }

  if (queuedCount === 0) {
    await vipGuestSyncService.createNoFileReport();
  }
}

export function startVipGuestSyncWorker() {
  const cronExpression = process.env.VIP_GUEST_IMPORT_CRON || '0 1 * * *';
  if (!cron.validate(cronExpression)) {
    console.warn(`[VipGuestSyncWorker] Invalid cron expression: ${cronExpression}`);
    return;
  }

  cron.schedule(cronExpression, () => {
    pollSponsorMailbox().catch((error) => {
      console.error('[VipGuestSyncWorker] Mailbox poll failed:', error);
    });
  });

  console.log(`[VipGuestSyncWorker] Scheduled mailbox poll with cron ${cronExpression}`);
}
