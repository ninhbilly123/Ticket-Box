import cron from 'node-cron';
import { prisma } from '../shared/lib/prisma';
import { sendEmail } from '../shared/lib/email';

const REMINDER_TYPE = 'concert_reminder_24h';

let reminderCronScheduled = false;
let reminderRunInProgress = false;

function getReminderConfig() {
  return {
    cronExpression: process.env.CONCERT_REMINDER_CRON || '*/15 * * * *',
    hoursBefore: Number(process.env.CONCERT_REMINDER_HOURS_BEFORE || 24),
    lookaheadMinutes: Number(process.env.CONCERT_REMINDER_LOOKAHEAD_MINUTES || 30),
  };
}

function formatDateTime(value: Date) {
  return value.toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

async function sendReminderForUser(params: {
  user: { id: string; email: string; fullName: string };
  concert: { id: string; name: string; venue: string; startAt: Date };
  ticketCount: number;
}) {
  const { user, concert, ticketCount } = params;

  const sentReminder = await prisma.notification.findFirst({
    where: {
      userId: user.id,
      concertId: concert.id,
      channel: 'email',
      type: REMINDER_TYPE,
      status: 'sent',
    },
  });

  if (sentReminder) return;

  const subject = `[TicketBox] Nhac lich tham du - ${concert.name}`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 640px; margin: auto; padding: 20px; border: 1px solid #dbe3ef; border-radius: 10px;">
      <h2 style="margin: 0 0 12px; color: #1d4ed8;">TicketBox nhac lich tham du</h2>
      <p>Xin chao <strong>${user.fullName}</strong>,</p>
      <p>Su kien <strong>${concert.name}</strong> cua ban se dien ra trong khoang 24 gio toi.</p>
      <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
        <tr>
          <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; color: #64748b;">Thoi gian</td>
          <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;"><strong>${formatDateTime(concert.startAt)}</strong></td>
        </tr>
        <tr>
          <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; color: #64748b;">Dia diem</td>
          <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;"><strong>${concert.venue}</strong></td>
        </tr>
        <tr>
          <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; color: #64748b;">So ve</td>
          <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;"><strong>${ticketCount}</strong></td>
        </tr>
      </table>
      <p>Vui long chuan bi e-ticket QR trong email hoac tai khoan TicketBox de check-in tai cong.</p>
      <p style="font-size: 13px; color: #64748b;">Luu y: Ma QR chi duoc su dung mot lan. Khong chia se QR cho nguoi khac.</p>
    </div>
  `;

  let sent = false;
  try {
    await sendEmail(user.email, subject, html);
    sent = true;
  } catch (error) {
    console.error(`[ConcertReminderWorker] Failed to send reminder to ${user.email}:`, error);
  }

  await prisma.notification.create({
    data: {
      userId: user.id,
      concertId: concert.id,
      channel: 'email',
      type: REMINDER_TYPE,
      status: sent ? 'sent' : 'failed',
      scheduledAt: new Date(concert.startAt.getTime() - 24 * 60 * 60 * 1000),
      sentAt: sent ? new Date() : null,
    },
  });

  if (sent) {
    await prisma.notification.create({
      data: {
        userId: user.id,
        concertId: concert.id,
        channel: 'app',
        type: REMINDER_TYPE,
        status: 'sent',
        scheduledAt: new Date(concert.startAt.getTime() - 24 * 60 * 60 * 1000),
        sentAt: new Date(),
      },
    });
  }
}

export async function runConcertReminderScan() {
  if (reminderRunInProgress) {
    console.log('[ConcertReminderWorker] Previous reminder scan is still running. Skipping this tick.');
    return;
  }

  reminderRunInProgress = true;
  const { hoursBefore, lookaheadMinutes } = getReminderConfig();
  const now = new Date();
  const windowStart = new Date(now.getTime() + hoursBefore * 60 * 60 * 1000);
  const windowEnd = new Date(windowStart.getTime() + lookaheadMinutes * 60 * 1000);

  try {
    const concerts = await prisma.concert.findMany({
      where: {
        startAt: {
          gte: windowStart,
          lt: windowEnd,
        },
        status: {
          notIn: ['cancelled', 'CANCELLED'],
        },
      },
      select: {
        id: true,
        name: true,
        venue: true,
        startAt: true,
      },
    });

    for (const concert of concerts) {
      const tickets = await prisma.ticket.findMany({
        where: {
          status: { in: ['valid', 'VALID'] },
          orderItem: {
            order: {
              concertId: concert.id,
              status: { in: ['paid', 'PAID'] },
            },
          },
        },
        select: {
          userId: true,
          user: {
            select: {
              id: true,
              email: true,
              fullName: true,
            },
          },
        },
      });

      const ticketsByUser = new Map<string, { user: { id: string; email: string; fullName: string }; count: number }>();
      for (const ticket of tickets) {
        const existing = ticketsByUser.get(ticket.userId);
        if (existing) {
          existing.count += 1;
        } else {
          ticketsByUser.set(ticket.userId, { user: ticket.user, count: 1 });
        }
      }

      for (const item of ticketsByUser.values()) {
        await sendReminderForUser({
          user: item.user,
          concert,
          ticketCount: item.count,
        });
      }
    }
  } finally {
    reminderRunInProgress = false;
  }
}

export function startConcertReminderWorker() {
  if (reminderCronScheduled) return;

  const { cronExpression } = getReminderConfig();
  if (!cron.validate(cronExpression)) {
    console.warn(`[ConcertReminderWorker] Invalid cron expression: ${cronExpression}`);
    return;
  }

  cron.schedule(cronExpression, () => {
    runConcertReminderScan().catch((error) => {
      console.error('[ConcertReminderWorker] Reminder scan failed:', error);
    });
  });

  reminderCronScheduled = true;
  console.log(`[ConcertReminderWorker] Scheduled reminder scan with cron ${cronExpression}`);
}

