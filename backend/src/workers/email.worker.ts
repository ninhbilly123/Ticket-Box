import { Queue, Worker, Job } from 'bullmq';
import { sendEmail } from '../shared/lib/email';
import QRCode from 'qrcode';

// Create a connection object based on REDIS_URL
let host = 'localhost';
let port = 6379;
if (process.env.REDIS_URL) {
  const url = new URL(process.env.REDIS_URL);
  host = url.hostname;
  port = parseInt(url.port || '6379', 10);
}

const connection = {
  host,
  port,
};

// Queue instance for producing jobs
export const emailQueue = new Queue('emailQueue', { connection });

// Worker instance for consuming jobs
export const emailWorker = new Worker(
  'emailQueue',
  async (job: Job) => {
    const { email, orderId, tickets } = job.data;

    console.log(`[EmailWorker] Processing email for order ${orderId} to ${email}`);

    let htmlContent = `
      <h2>Cảm ơn bạn đã mua vé tại TicketBox!</h2>
      <p>Mã đơn hàng của bạn: <strong>${orderId}</strong></p>
      <p>Dưới đây là thông tin vé điện tử của bạn:</p>
      <div style="display: flex; flex-direction: column; gap: 20px;">
    `;

    const attachments: any[] = [];

    for (let i = 0; i < tickets.length; i++) {
      const ticket = tickets[i];
      // Generate QR Code as Data URI or buffer
      const qrBuffer = await QRCode.toBuffer(ticket.qrToken || '', {
        type: 'png',
        width: 300,
        margin: 2,
      });

      const cid = `qr-${ticket.id}`;
      attachments.push({
        filename: `ticket-${ticket.id}.png`,
        content: qrBuffer,
        cid: cid,
      });

      htmlContent += `
        <div style="border: 1px solid #ccc; padding: 15px; border-radius: 8px;">
          <h3>Vé #${i + 1}</h3>
          <p>Mã ghế: ${ticket.seatNumber || 'Không chọn ghế'}</p>
          <img src="cid:${cid}" alt="QR Code" style="width: 200px; height: 200px;" />
          <p style="font-size: 12px; color: #666;">Vui lòng trình mã QR này tại cổng sự kiện.</p>
        </div>
      `;
    }

    htmlContent += `
      </div>
      <p>Hẹn gặp lại bạn tại sự kiện!</p>
    `;

    try {
      await sendEmail(
        email,
        `[TicketBox] Xác nhận mua vé thành công - Đơn hàng ${orderId}`,
        htmlContent,
        attachments
      );
      console.log(`[EmailWorker] Email sent for order ${orderId}`);
    } catch (e: any) {
      console.error(`[EmailWorker] Failed to send email via SMTP (mock): ${e.message}`);
    }
  },
  { connection }
);

emailWorker.on('failed', (job, err) => {
  console.error(`[EmailWorker] Job ${job?.id} failed:`, err);
});
