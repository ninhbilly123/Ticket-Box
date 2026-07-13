import { Worker, Job } from 'bullmq';
import QRCode from 'qrcode';
import { prisma } from '../shared/lib/prisma';
import { sendEmail } from '../shared/lib/email';
import { queueConnection } from '../shared/lib/queue';

interface VipGuestEmailJob {
  vipGuestId: string;
  importJobId?: string;
}

let emailWorker: Worker | null = null;

async function sendVipGuestTicket(job: Job<VipGuestEmailJob>) {
  if (job.name !== 'sendVipGuestTicketEmail') return;

  const { vipGuestId, importJobId } = job.data;
  const guest = await prisma.vipGuest.findUnique({
    where: { id: vipGuestId },
    include: { concert: true },
  });

  if (!guest || !guest.email || !guest.qrToken) {
    if (guest) {
      await prisma.vipGuest.update({
        where: { id: guest.id },
        data: {
          emailStatus: 'SKIPPED',
          emailError: 'Khach moi khong co email hoac QR token.',
        },
      });
    }
    return;
  }

  try {
    const qrBuffer = await QRCode.toBuffer(guest.qrToken, {
      type: 'png',
      width: 300,
      margin: 2,
    });
    const htmlContent = `
      <h2>TicketBox - E-ticket khach moi VIP</h2>
      <p>Xin chao <strong>${guest.fullName}</strong>,</p>
      <p>Ban duoc moi tham du su kien <strong>${guest.concert.name}</strong>.</p>
      <p>Dia diem: ${guest.concert.venue}</p>
      <p>Thoi gian: ${guest.concert.startAt.toISOString()}</p>
      <p>Vui long trinh ma QR nay tai cong VIP de check-in.</p>
      <img src="cid:vip-qr-${guest.id}" alt="VIP QR Code" style="width: 220px; height: 220px;" />
    `;

    await sendEmail(
      guest.email,
      `[TicketBox] E-ticket khach moi VIP - ${guest.concert.name}`,
      htmlContent,
      [{ filename: `vip-ticket-${guest.id}.png`, content: qrBuffer, cid: `vip-qr-${guest.id}` }]
    );

    await prisma.vipGuest.update({
      where: { id: guest.id },
      data: { emailStatus: 'SENT', emailError: null },
    });
    if (importJobId) {
      await prisma.guestImportJob.update({
        where: { id: importJobId },
        data: { emailSentRows: { increment: 1 } },
      });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Email sending failed';
    await prisma.vipGuest.update({
      where: { id: guest.id },
      data: { emailStatus: 'FAILED', emailError: message },
    });
    throw error;
  }
}

export function startEmailWorker() {
  if (emailWorker) return emailWorker;

  emailWorker = new Worker('emailQueue', sendVipGuestTicket, { connection: queueConnection });
  emailWorker.on('failed', (job, error) => {
    console.error(`[EmailWorker] Job ${job?.id} failed:`, error);
  });
  console.log('[EmailWorker] Initialized');
  return emailWorker;
}
