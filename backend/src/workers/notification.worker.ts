import nodemailer from 'nodemailer';
import { ConsumeMessage } from 'amqplib';
import { prisma } from '../shared/lib/prisma';
import { connectRabbitMQ } from '../shared/lib/rabbitmq';

const QUEUE_NAME = 'ticketbox_notifications';

interface NotificationMessage {
  type: 'purchase_confirm' | 'concert_cancelled' | 'purchase_failed';
  payload: {
    userId: string;
    concertId: string;
    ticketId?: string;
    orderId?: string;
    reason?: string;
  };
}

let transporter: nodemailer.Transporter;

// Khởi tạo Transporter cho Nodemailer (sử dụng Ethereal Email hoặc SMTP thật)
async function initMailer() {
  if (transporter) return;

  try {
    // Nếu có biến cấu hình SMTP thật trong env
    if (process.env.SMTP_HOST && process.env.SMTP_USER) {
      transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT) || 587,
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });
      console.log('[Notification Worker] Real SMTP mailer initialized');
    } else {
      // Sử dụng Ethereal Email để giả lập mail test tự động trong môi trường dev
      console.log('[Notification Worker] No real SMTP config found. Generating Ethereal test account...');
      const testAccount = await nodemailer.createTestAccount();
      transporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass,
        },
      });
      console.log('[Notification Worker] Ethereal test mailer ready. User:', testAccount.user);
    }
  } catch (err) {
    console.error('[Notification Worker] Failed to initialize mailer:', err);
  }
}

// Hàm gửi mail thực tế
async function sendEmail(to: string, subject: string, htmlContent: string) {
  await initMailer();
  try {
    const info = await transporter.sendMail({
      from: '"TicketBox Notification" <no-reply@ticketbox.com>',
      to,
      subject,
      html: htmlContent,
    });
    console.log(`[Notification Worker] Email sent: [${subject}] to [${to}]`);
    // Lấy URL preview mail nếu dùng Ethereal
    const previewUrl = nodemailer.getTestMessageUrl(info);
    if (previewUrl) {
      console.log(`[Notification Worker] Preview Ethereal Email here: ${previewUrl}`);
    }
    return true;
  } catch (err) {
    console.error(`[Notification Worker] Failed to send email to ${to}:`, err);
    return false;
  }
}

// Xử lý sự kiện gửi email xác nhận đặt vé thành công
async function handlePurchaseConfirm(payload: NotificationMessage['payload']) {
  const { userId, ticketId, concertId } = payload;
  if (!userId || !ticketId) {
    console.error('[Notification Worker] Missing userId or ticketId for purchase_confirm');
    return;
  }

  // Lấy thông tin user và vé
  const user = await prisma.user.findUnique({ where: { id: userId } });
  const ticket = await prisma.ticket.findUnique({
    where: { id: ticketId },
    include: {
      orderItem: {
        include: {
          ticketType: true,
        },
      },
    },
  });
  const concert = await prisma.concert.findUnique({ where: { id: concertId } });

  if (!user || !ticket || !concert) {
    console.error('[Notification Worker] User, Ticket, or Concert records not found in database');
    return;
  }

  const subject = `[TicketBox] Xác nhận đặt vé thành công - ${concert.name}`;
  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
      <h2 style="color: #4CAF50; text-align: center;">Đặt Vé Thành Công!</h2>
      <p>Xin chào <strong>${user.fullName}</strong>,</p>
      <p>Cảm ơn bạn đã đặt vé tại TicketBox. Dưới đây là thông tin vé điện tử (E-Ticket) của bạn:</p>
      <table style="width: 100%; border-collapse: collapse; margin-top: 15px;">
        <tr style="background-color: #f2f2f2;">
          <th style="padding: 8px; text-align: left; border-bottom: 1px solid #ddd;">Concert</th>
          <td style="padding: 8px; border-bottom: 1px solid #ddd;">${concert.name}</td>
        </tr>
        <tr>
          <th style="padding: 8px; text-align: left; border-bottom: 1px solid #ddd;">Địa điểm</th>
          <td style="padding: 8px; border-bottom: 1px solid #ddd;">${concert.venue}</td>
        </tr>
        <tr style="background-color: #f2f2f2;">
          <th style="padding: 8px; text-align: left; border-bottom: 1px solid #ddd;">Thời gian</th>
          <td style="padding: 8px; border-bottom: 1px solid #ddd;">${new Date(concert.startAt).toLocaleString('vi-VN')}</td>
        </tr>
        <tr>
          <th style="padding: 8px; text-align: left; border-bottom: 1px solid #ddd;">Phân hạng vé</th>
          <td style="padding: 8px; border-bottom: 1px solid #ddd;">${ticket.orderItem.ticketType.name}</td>
        </tr>
        <tr style="background-color: #f2f2f2;">
          <th style="padding: 8px; text-align: left; border-bottom: 1px solid #ddd;">Mã Ghế</th>
          <td style="padding: 8px; border-bottom: 1px solid #ddd;">${ticket.id.substring(0, 8).toUpperCase()}</td>
        </tr>
      </table>
      <div style="text-align: center; margin: 30px 0;">
        <p style="font-weight: bold; margin-bottom: 10px;">MÃ QR SOÁT VÉ CỦA BẠN:</p>
        <!-- Chèn mã QR (trong thực tế có thể dùng api tạo QR hoặc gửi ticketId) -->
        <img src="https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${ticket.qrCode}" alt="E-Ticket QR" style="border: 2px solid #ddd; padding: 10px; border-radius: 8px;" />
        <p style="color: #666; font-size: 12px; margin-top: 5px;">Vui lòng đưa mã QR này cho nhân viên tại cổng soát vé.</p>
      </div>
      <p style="font-size: 13px; color: #888;">Lưu ý: Không chia sẻ ảnh QR này cho bất kỳ ai để bảo mật quyền vào cổng.</p>
    </div>
  `;

  // Gửi email
  const isSent = await sendEmail(user.email, subject, htmlContent);

  // Tạo log thông báo trong database (in-app + email status)
  await prisma.notification.create({
    data: {
      userId: user.id,
      concertId: concert.id,
      channel: 'email',
      type: 'purchase_confirm',
      status: isSent ? 'sent' : 'failed',
      sentAt: isSent ? new Date() : null,
    },
  });

  // Tạo thêm bản ghi in-app notification
  await prisma.notification.create({
    data: {
      userId: user.id,
      concertId: concert.id,
      channel: 'app',
      type: 'purchase_confirm',
      status: 'sent',
      sentAt: new Date(),
    },
  });
}

// Xử lý sự kiện khi concert bị hủy
async function handleConcertCancelled(payload: NotificationMessage['payload']) {
  const { concertId } = payload;
  if (!concertId) {
    console.error('[Notification Worker] Missing concertId for concert_cancelled');
    return;
  }

  const concert = await prisma.concert.findUnique({ where: { id: concertId } });
  if (!concert) {
    console.error('[Notification Worker] Concert not found for cancellation:', concertId);
    return;
  }

  // Tìm toàn bộ vé đã đặt thành công của concert này
  const tickets = await prisma.ticket.findMany({
    where: {
      orderItem: {
        order: {
          concertId: concertId,
          status: 'paid', // Hoặc 'PAID' tuỳ config
        },
      },
      status: 'valid',
    },
    include: {
      orderItem: {
        include: {
          order: true,
        },
      },
    },
  });

  // Gửi email cho từng chủ vé
  const uniqueUserIds = Array.from(new Set(tickets.map((t) => t.userId)));
  console.log(`[Notification Worker] Sending cancellation email to ${uniqueUserIds.length} users...`);

  for (const userId of uniqueUserIds) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) continue;

    const subject = `[KHẨN CẤP] Thông báo hủy sự kiện - ${concert.name}`;
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #f44336; border-radius: 8px;">
        <h2 style="color: #f44336; text-align: center;">THÔNG BÁO HỦY SỰ KIỆN</h2>
        <p>Xin chào <strong>${user.fullName}</strong>,</p>
        <p>Chúng tôi rất tiếc phải thông báo rằng sự kiện <strong>${concert.name}</strong> dự kiến tổ chức vào ngày <strong>${new Date(concert.startAt).toLocaleDateString('vi-VN')}</strong> tại <strong>${concert.venue}</strong> đã bị hủy vì lý do bất khả kháng.</p>
        <p><strong>Về việc hoàn tiền:</strong></p>
        <p>Hệ thống TicketBox sẽ tự động xử lý hoàn tiền 100% giá trị vé cho bạn qua cổng thanh toán bạn đã giao dịch trong vòng 7-14 ngày làm việc. Bạn không cần thực hiện thêm bất kỳ thao tác nào.</p>
        <p>Chúng tôi thành thật xin lỗi vì sự bất tiện này.</p>
        <p style="font-size: 13px; color: #888; margin-top: 30px;">Trân trọng,<br>Ban quản trị TicketBox</p>
      </div>
    `;

    const isSent = await sendEmail(user.email, subject, htmlContent);

    // Lưu notification
    await prisma.notification.create({
      data: {
        userId: user.id,
        concertId: concert.id,
        channel: 'email',
        type: 'concert_cancelled',
        status: isSent ? 'sent' : 'failed',
        sentAt: isSent ? new Date() : null,
      },
    });

    await prisma.notification.create({
      data: {
        userId: user.id,
        concertId: concert.id,
        channel: 'app',
        type: 'concert_cancelled',
        status: 'sent',
        sentAt: new Date(),
      },
    });
  }
}

// Xử lý sự kiện khi thanh toán thất bại
async function handlePurchaseFailed(payload: NotificationMessage['payload']) {
  const { userId, concertId, reason } = payload;
  const user = await prisma.user.findUnique({ where: { id: userId } });
  const concert = await prisma.concert.findUnique({ where: { id: concertId } });

  if (!user || !concert) return;

  const subject = `[TicketBox] Thông báo giao dịch đặt vé không thành công`;
  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #ff9800; border-radius: 8px;">
      <h2 style="color: #ff9800; text-align: center;">Giao Dịch Thất Bại</h2>
      <p>Xin chào <strong>${user.fullName}</strong>,</p>
      <p>Giao dịch đặt vé cho sự kiện <strong>${concert.name}</strong> của bạn đã không thành công.</p>
      <p><strong>Lý do:</strong> ${reason || 'Giao dịch bị quá thời gian thanh toán (timeout) hoặc bị hủy từ đối tác.'}</p>
      <p><strong>Yên tâm:</strong> Tài khoản ngân hàng của bạn chưa bị trừ tiền cho giao dịch này. Bạn vui lòng quay lại trang chi tiết concert và tiến hành đặt vé mới.</p>
      <p style="font-size: 13px; color: #888; margin-top: 30px;">Trân trọng,<br>Hệ thống TicketBox</p>
    </div>
  `;

  const isSent = await sendEmail(user.email, subject, htmlContent);

  await prisma.notification.create({
    data: {
      userId: user.id,
      concertId: concert.id,
      channel: 'email',
      type: 'purchase_failed',
      status: isSent ? 'sent' : 'failed',
      sentAt: isSent ? new Date() : null,
    },
  });

  await prisma.notification.create({
    data: {
      userId: user.id,
      concertId: concert.id,
      channel: 'app',
      type: 'purchase_failed',
      status: 'sent',
      sentAt: new Date(),
    },
  });
}

// Hàm khởi chạy Worker lắng nghe hàng đợi
export async function startNotificationWorker() {
  console.log('[Notification Worker] Initializing...');
  await initMailer();

  try {
    const { channel } = await connectRabbitMQ();
    
    // Đảm bảo queue được khởi tạo
    await channel.assertQueue(QUEUE_NAME, { durable: true });
    
    // Giới hạn chỉ nhận 1 message xử lý cùng 1 lúc (fair dispatch)
    await channel.prefetch(1);

    console.log(`[Notification Worker] Worker started, listening to queue [${QUEUE_NAME}]...`);

    channel.consume(QUEUE_NAME, async (msg: ConsumeMessage | null) => {
      if (!msg) return;

      try {
        const messageContent = msg.content.toString();
        const data: NotificationMessage = JSON.parse(messageContent);
        
        console.log(`[Notification Worker] Received message type: ${data.type}`);

        switch (data.type) {
          case 'purchase_confirm':
            await handlePurchaseConfirm(data.payload);
            break;
          case 'concert_cancelled':
            await handleConcertCancelled(data.payload);
            break;
          case 'purchase_failed':
            await handlePurchaseFailed(data.payload);
            break;
          default:
            console.warn(`[Notification Worker] Unhandled message type: ${data.type}`);
        }

        // Gửi xác nhận đã xử lý xong message (ack)
        channel.ack(msg);
      } catch (err) {
        console.error('[Notification Worker] Error processing message:', err);
        // Gửi requeue nếu xử lý thất bại (trong thực tế có thể log/chuyển vào Dead Letter Queue)
        channel.nack(msg, false, true);
      }
    });

  } catch (err) {
    console.error('[Notification Worker Error] Failed to start notification listener:', err);
    // Thử khởi động lại sau 5 giây nếu lỗi kết nối MQ
    setTimeout(startNotificationWorker, 5000);
  }
}

export default startNotificationWorker;
