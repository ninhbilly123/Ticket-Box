import type { PaymentStatus } from '@prisma/client';

export type PaymentGateway = 'vnpay' | 'momo';

export type ProcessedPaymentStatus = Extract<PaymentStatus, 'SUCCESS' | 'FAILED'>;

export interface VnpayVerificationResult {
  paymentId: string;
  responseCode: string;
  amount: string;
  transactionNo?: string;
}
