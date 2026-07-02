import crypto from 'crypto';

const SECRET_KEY = process.env.QR_SECRET_KEY || 'default_secret_key_for_dev_only';

/**
 * Generate a secure QR token using HMAC SHA256
 * @param ticketId The ID of the ticket
 * @returns A hex string representing the secure QR token
 */
export function generateQrToken(ticketId: string): string {
  return crypto.createHmac('sha256', SECRET_KEY).update(ticketId).digest('hex');
}

export function generateVipGuestQrToken(vipGuestId: string): string {
  return crypto.createHmac('sha256', SECRET_KEY).update(`vip-guest:${vipGuestId}`).digest('hex');
}

/**
 * Verify a QR token matches a given ticket ID
 */
export function verifyQrToken(ticketId: string, token: string): boolean {
  const expectedToken = generateQrToken(ticketId);
  try {
    return crypto.timingSafeEqual(Buffer.from(expectedToken), Buffer.from(token));
  } catch (e) {
    return false; // In case length doesn't match
  }
}

export function verifyVipGuestQrToken(vipGuestId: string, token: string): boolean {
  const expectedToken = generateVipGuestQrToken(vipGuestId);
  try {
    return crypto.timingSafeEqual(Buffer.from(expectedToken), Buffer.from(token));
  } catch {
    return false;
  }
}
