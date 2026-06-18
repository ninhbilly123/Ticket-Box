import nodemailer from 'nodemailer';

function normalizeEnvSecret(value: string | undefined, fallback: string): string {
  return (value || fallback).replace(/\s+/g, '');
}

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.ethereal.email',
  port: parseInt(process.env.SMTP_PORT || '587', 10),
  auth: {
    user: process.env.SMTP_USER || 'test',
    pass: normalizeEnvSecret(process.env.SMTP_PASS, 'test'),
  },
});

export const sendEmail = async (to: string, subject: string, html: string, attachments?: any[]) => {
  return transporter.sendMail({
    from: process.env.SMTP_FROM || '"TicketBox" <no-reply@ticketbox.local>',
    to,
    subject,
    html,
    attachments,
  });
};
