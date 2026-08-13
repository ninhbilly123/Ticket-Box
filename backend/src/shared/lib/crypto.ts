import crypto from 'crypto';

function getQrSecretKey() {
  const secret = process.env.QR_SECRET_KEY;
  if (!secret || secret.trim().length < 32 || secret === 'default_secret_key_for_dev_only') {
    throw new Error('QR_SECRET_KEY must be set to a non-default secret with at least 32 characters.');
  }
  return secret;
}

/**
 * Generate a secure QR token using HMAC SHA256
 * @param ticketId The ID of the ticket
 * @returns A hex string representing the secure QR token
 */
export function generateQrToken(ticketId: string): string {
  return crypto.createHmac('sha256', getQrSecretKey()).update(ticketId).digest('hex');
}

export function generateVipGuestQrToken(vipGuestId: string): string {
  return crypto.createHmac('sha256', getQrSecretKey()).update(`vip-guest:${vipGuestId}`).digest('hex');
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
