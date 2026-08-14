import * as crypto from 'crypto';
import { Injectable } from '@nestjs/common';
import { AppError } from '../../shared/lib/errors';
import type { VnpayVerificationResult } from './payment.types';

interface CreateVnpayPaymentUrlParams {
  paymentId: string;
  orderId: string;
  amount: number;
  returnUrl: string;
  ipAddr: string;
}

function getVNPTime(): string {
  const date = new Date();
  const tzOffset = 7 * 60;
  const vnTime = new Date(date.getTime() + tzOffset * 60 * 1000 + date.getTimezoneOffset() * 60 * 1000);

  const pad = (num: number) => String(num).padStart(2, '0');

  const year = vnTime.getFullYear();
  const month = pad(vnTime.getMonth() + 1);
  const day = pad(vnTime.getDate());
  const hour = pad(vnTime.getHours());
  const minute = pad(vnTime.getMinutes());
  const second = pad(vnTime.getSeconds());

  return `${year}${month}${day}${hour}${minute}${second}`;
}

export function sortObject(obj: Record<string, string>) {
  return Object.keys(obj)
    .sort()
    .reduce<Record<string, string>>((sorted, key) => {
      sorted[encodeURIComponent(key)] = encodeURIComponent(obj[key]).replace(/%20/g, '+');
      return sorted;
    }, {});
}

function stringifyParams(obj: Record<string, string>): string {
  return Object.entries(obj)
    .map(([key, val]) => `${key}=${val}`)
    .join('&');
}

export function timingSafeStringEqual(left?: string, right?: string): boolean {
  if (!left || !right) return false;
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  if (leftBuffer.length !== rightBuffer.length) return false;
  return crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

@Injectable()
export class VnpayGatewayService {
  public createPaymentUrl(params: CreateVnpayPaymentUrlParams): string {
    const tmnCode = process.env.VNPAY_TMN_CODE;
    const secretKey = process.env.VNPAY_HASH_SECRET;
    const vnpUrl = process.env.VNPAY_URL || 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html';

    if (!tmnCode || !secretKey) {
      throw new AppError(500, 'CONFIG_ERROR', 'Chua cau hinh VNPAY_TMN_CODE hoac VNPAY_HASH_SECRET trong file .env');
    }

    const vnpParams: Record<string, string> = {
      vnp_Version: '2.1.0',
      vnp_Command: 'pay',
      vnp_TmnCode: tmnCode,
      vnp_Locale: 'vn',
      vnp_CurrCode: 'VND',
      vnp_TxnRef: params.paymentId,
      vnp_OrderInfo: `Thanh toan don hang ${params.orderId}`,
      vnp_OrderType: 'other',
      vnp_Amount: String(Math.round(params.amount * 100)),
      vnp_ReturnUrl: params.returnUrl,
      vnp_IpAddr: params.ipAddr,
      vnp_CreateDate: getVNPTime(),
    };

    const sortedParams = sortObject(vnpParams);
    sortedParams['vnp_SecureHash'] = this.sign(sortedParams, secretKey);

    return `${vnpUrl}?${stringifyParams(sortedParams)}`;
  }

  public verifyIpn(query: Record<string, unknown>): VnpayVerificationResult | null {
    const secretKey = process.env.VNPAY_HASH_SECRET;
    if (!secretKey) {
      throw new AppError(500, 'CONFIG_ERROR', 'Chua cau hinh VNPAY_HASH_SECRET trong file .env');
    }

    return this.verify(query, secretKey);
  }

  public verifyReturn(query: Record<string, unknown>): VnpayVerificationResult | null {
    const secretKey = process.env.VNPAY_HASH_SECRET;
    if (!secretKey) {
      throw new AppError(500, 'CONFIG_ERROR', 'Chua cau hinh VNPAY_HASH_SECRET trong file .env');
    }

    return this.verify(query, secretKey);
  }

  private verify(query: Record<string, unknown>, secretKey: string): VnpayVerificationResult | null {
    const secureHash = query['vnp_SecureHash'];
    const vnpParams = this.extractSignedParams(query);
    const signed = this.sign(vnpParams, secretKey);

    if (!timingSafeStringEqual(String(secureHash || ''), signed)) {
      return null;
    }

    return {
      paymentId: vnpParams['vnp_TxnRef'],
      responseCode: vnpParams['vnp_ResponseCode'],
      amount: vnpParams['vnp_Amount'],
      transactionNo: vnpParams['vnp_TransactionNo'],
    };
  }

  private extractSignedParams(query: Record<string, unknown>): Record<string, string> {
    const vnpParams: Record<string, string> = {};
    for (const key of Object.keys(query)) {
      if (key !== 'vnp_SecureHash' && key !== 'vnp_SecureHashType') {
        vnpParams[key] = String(query[key]);
      }
    }
    return sortObject(vnpParams);
  }

  private sign(params: Record<string, string>, secretKey: string): string {
    const hmac = crypto.createHmac('sha512', secretKey);
    return hmac.update(Buffer.from(stringifyParams(params), 'utf-8')).digest('hex');
  }
}
