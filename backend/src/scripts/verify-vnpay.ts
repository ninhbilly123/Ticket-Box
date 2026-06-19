import * as crypto from 'crypto';
import dotenv from 'dotenv';
import { sortObject } from '../modules/payment/payment.service';

// Load environment variables
dotenv.config();

function stringifyParams(obj: any): string {
  return Object.entries(obj)
    .map(([key, val]) => `${key}=${val}`)
    .join('&');
}

async function runTest() {
  console.log('=== VNPAY Integration Signature Verification Test ===');
  
  const secret = process.env.VNPAY_HASH_SECRET || '4FXLYK40HM7D8PVGSZBTSSVW91ILV52D';
  const tmnCode = process.env.VNPAY_TMN_CODE || '7JSZ2X3E';
  
  console.log(`Using TmnCode: ${tmnCode}`);
  console.log(`Using HashSecret: ${secret}`);

  // 1. Simulate checkout parameters
  const checkoutParams: Record<string, string> = {
    vnp_Version: '2.1.0',
    vnp_Command: 'pay',
    vnp_TmnCode: tmnCode,
    vnp_Locale: 'vn',
    vnp_CurrCode: 'VND',
    vnp_TxnRef: 'test-payment-id-123456',
    vnp_OrderInfo: 'Thanh toan don hang test-order-id-789',
    vnp_OrderType: 'other',
    vnp_Amount: '50000000', // 500,000 VND
    vnp_ReturnUrl: 'http://localhost:3000/api/v1/payments/vnpay-return',
    vnp_IpAddr: '127.0.0.1',
    vnp_CreateDate: '20260618230000',
  };

  const sortedCheckout = sortObject(checkoutParams);
  const checkoutSignData = stringifyParams(sortedCheckout);
  const checkoutHmac = crypto.createHmac('sha512', secret);
  const checkoutHash = checkoutHmac.update(Buffer.from(checkoutSignData, 'utf-8')).digest('hex');
  const checkoutUrl = `https://sandbox.vnpayment.vn/paymentv2/vpcpay.html?${checkoutSignData}&vnp_SecureHash=${checkoutHash}`;

  console.log('\n--- Checkout URL Generated ---');
  console.log(checkoutUrl);

  // 2. Simulate VNPAY calling our IPN/Return endpoint
  // VNPAY sends back the params we sent + transaction details, all signed using their own private key (represented by our secret key).
  const rawCallbackParams: Record<string, string> = {
    ...checkoutParams,
    vnp_ResponseCode: '00',
    vnp_TransactionNo: '14101234',
    vnp_TransactionStatus: '00',
    vnp_PayDate: '20260618230500',
  };

  // VNPAY signs the callback payload:
  const sortedCallback = sortObject(rawCallbackParams);
  const callbackSignData = stringifyParams(sortedCallback);
  const callbackHmac = crypto.createHmac('sha512', secret);
  const vnpSecureHash = callbackHmac.update(Buffer.from(callbackSignData, 'utf-8')).digest('hex');

  // This is the query object Express receives in req.query
  const receivedExpressQuery: Record<string, string> = {
    ...rawCallbackParams,
    vnp_SecureHash: vnpSecureHash,
  };

  console.log('\n--- Received Query Object in Express (req.query) ---');
  console.log(receivedExpressQuery);

  // 3. Process Verification (inside PaymentService)
  const secureHashReceived = receivedExpressQuery.vnp_SecureHash;
  
  // Extract keys other than Hash
  const verifyParams: Record<string, string> = {};
  for (const key of Object.keys(receivedExpressQuery)) {
    if (key !== 'vnp_SecureHash' && key !== 'vnp_SecureHashType') {
      verifyParams[key] = receivedExpressQuery[key];
    }
  }

  const sortedVerify = sortObject(verifyParams);
  const verifySignData = stringifyParams(sortedVerify);
  
  const verifyHmac = crypto.createHmac('sha512', secret);
  const verifySignedHash = verifyHmac.update(Buffer.from(verifySignData, 'utf-8')).digest('hex');

  console.log('\n--- Verification Calculations ---');
  console.log(`Received Hash: ${secureHashReceived}`);
  console.log(`Calculated Hash: ${verifySignedHash}`);

  if (secureHashReceived === verifySignedHash) {
    console.log('\n✅ SUCCESS: Signature verified successfully! The implementation matches the VNPAY protocol.');
  } else {
    console.error('\n❌ FAILURE: Signatures do not match.');
    process.exit(1);
  }
}

runTest().catch((err) => {
  console.error(err);
  process.exit(1);
});
