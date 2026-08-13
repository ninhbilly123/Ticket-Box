import { prisma } from '../src/shared/lib/prisma';
import { OrderHoldService } from '../src/modules/order/order-hold.service';
import { PaymentService } from '../src/modules/payment/payment.service';

const orderHoldService = new OrderHoldService(prisma as any);
const paymentService = new PaymentService(prisma as any);

async function main() {
  console.log('=== Khởi chạy Payment & QR Code Verification Test (IM02) ===');

  console.log('1. Khởi tạo dữ liệu Test...');
  const org = await prisma.organization.create({
    data: { name: `Test Org Payment ${Date.now()}` },
  });

  const organizer = await prisma.user.create({
    data: {
      email: `organizer-pay-${Date.now()}@example.com`,
      passwordHash: 'dummy-hash',
      fullName: 'Test Organizer Payment',
      role: 'ORGANIZER',
      organizationId: org.id,
      status: 'ACTIVE',
    },
  });

  const concert = await prisma.concert.create({
    data: {
      eventCode: `CONC-PAY-${Date.now()}`,
      organizerId: organizer.id,
      organizationId: org.id,
      name: 'Test Concert Payment',
      venue: 'Payment Test Arena',
      startAt: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
      saleOpenAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
      status: 'ON_SALE',
    },
  });

  const ticketType = await prisma.ticketType.create({
    data: {
      concertId: concert.id,
      name: 'GA Pay Test',
      zoneCode: 'ZONE-GA',
      price: 500000,
      totalQuantity: 50,
      maxPerAccount: 5,
    },
  });

  await prisma.ticketInventory.create({
    data: {
      ticketTypeId: ticketType.id,
      totalQuantity: 50,
      availableQuantity: 50,
      reservedQuantity: 0,
      soldQuantity: 0,
    },
  });

  const user = await prisma.user.create({
    data: {
      email: `aud-pay-${Date.now()}@example.com`,
      passwordHash: 'dummy-hash',
      fullName: 'Payment Test Audience',
      role: 'AUDIENCE',
      status: 'ACTIVE',
    },
  });

  // 2. Tạo đơn hàng giữ vé PENDING
  console.log('2. Đang tạo đơn hàng giữ vé PENDING...');
  const holdResponse = await orderHoldService.holdOrder({
    userId: user.id,
    concertId: concert.id,
    idempotencyKey: `idem-pay-${Date.now()}`,
    items: [{ ticketTypeId: ticketType.id, quantity: 1 }],
  });

  // Tìm ID đơn hàng vừa tạo
  const order = await prisma.order.findFirst({
    where: { userId: user.id, concertId: concert.id },
  });
  if (!order) {
    throw new Error('Order creation failed');
  }

  // 3. Khởi tạo thanh toán VNPAY (Sinh redirect URL)
  console.log('3. Khởi tạo thanh toán và sinh Redirect URL qua PaymentService...');
  const paymentRedirect = await paymentService.createPaymentUrl({
    orderId: order.id,
    ipAddr: '127.0.0.1',
    gateway: 'vnpay',
    returnUrl: 'http://localhost/api/v1/payments/vnpay-return',
    userId: user.id,
  });

  console.log(`- Redirect URL sinh ra: ${paymentRedirect.paymentUrl.substring(0, 100)}...`);

  // Tìm Payment record vừa tạo trong DB
  const paymentRecord = await prisma.payment.findFirst({
    where: { orderId: order.id },
  });
  if (!paymentRecord) {
    throw new Error('Payment record not found in DB');
  }

  // 4. Giả lập gọi Webhook / Callback IPN từ VNPAY báo thanh toán thành công
  console.log('4. Giả lập Webhook IPN báo VNPAY thành công...');
  // Xây dựng tham số giả lập
  const ipnQuery = {
    vnp_Version: '2.1.0',
    vnp_Command: 'pay',
    vnp_TmnCode: process.env.VNPAY_TMN_CODE || '7JSZ2X3E',
    vnp_Amount: '50000000', // 500,000 VND * 100
    vnp_CurrCode: 'VND',
    vnp_TxnRef: paymentRecord.id, // txRef là payment ID
    vnp_OrderInfo: `Thanh toan don hang ${order.id}`,
    vnp_OrderType: 'other',
    vnp_ResponseCode: '00', // Thành công
    vnp_TransactionNo: '14109999',
    vnp_TransactionStatus: '00',
    vnp_PayDate: '20260714000000',
  };

  // Ký chữ ký số giả lập bằng VNPAY_HASH_SECRET
  const secret = process.env.VNPAY_HASH_SECRET || '4FXLYK40HM7D8PVGSZBTSSVW91ILV52D';
  const crypto = require('crypto');
  const sortObject = (obj: any) => {
    const sorted: any = {};
    const str = [];
    let key;
    for (key in obj) {
      if (obj.hasOwnProperty(key)) {
        str.push(encodeURIComponent(key));
      }
    }
    str.sort();
    for (key = 0; key < str.length; key++) {
      sorted[str[key]] = encodeURIComponent(obj[str[key]]).replace(/%20/g, '+');
    }
    return sorted;
  };
  const stringifyParams = (obj: any) => {
    return Object.entries(obj)
      .map(([key, val]) => `${key}=${val}`)
      .join('&');
  };
  const sorted = sortObject(ipnQuery);
  const signData = stringifyParams(sorted);
  const hmac = crypto.createHmac('sha512', secret);
  const vnp_SecureHash = hmac.update(Buffer.from(signData, 'utf-8')).digest('hex');

  // Gửi request query giả lập
  const simulatedExpressQuery = {
    ...ipnQuery,
    vnp_SecureHash,
  };

  const ipnResult = await paymentService.processVNPAYIpn(simulatedExpressQuery);
  console.log(`- Kết quả xử lý IPN: ${JSON.stringify(ipnResult)}`);

  // 5. Kiểm tra sự thay đổi trạng thái Order và Ticket
  console.log('5. Kiểm tra thay đổi trạng thái đơn hàng và vé...');
  const updatedOrder = await prisma.order.findUnique({
    where: { id: order.id },
  });
  const updatedPayment = await prisma.payment.findUnique({
    where: { id: paymentRecord.id },
  });
  const ticket = await prisma.ticket.findFirst({
    where: { userId: user.id },
  });

  console.log(`- Trạng thái Order sau thanh toán: ${updatedOrder?.status} (Kỳ vọng: paid)`);
  console.log(`- Trạng thái Payment sau thanh toán: ${updatedPayment?.status} (Kỳ vọng: SUCCESS)`);
  console.log(`- Trạng thái Vé (Ticket): ${ticket?.status} (Kỳ vọng: valid)`);
  console.log(`- Mã QR của Vé: ${ticket?.qrCode}`);

  // 6. Dọn dẹp dữ liệu
  console.log('\n6. Đang dọn dẹp dữ liệu test...');
  await prisma.notification.deleteMany({ where: { concertId: concert.id } });
  if (ticket) {
    await prisma.ticket.delete({ where: { id: ticket.id } });
  }
  await prisma.orderItem.deleteMany({ where: { orderId: order.id } });
  await prisma.payment.delete({ where: { id: paymentRecord.id } });
  await prisma.order.delete({ where: { id: order.id } });
  await prisma.ticketInventory.delete({ where: { ticketTypeId: ticketType.id } });
  await prisma.ticketType.delete({ where: { id: ticketType.id } });
  await prisma.concert.delete({ where: { id: concert.id } });
  await prisma.user.deleteMany({ where: { id: { in: [user.id, organizer.id] } } });
  await prisma.organization.delete({ where: { id: org.id } });

  console.log('=== Dọn dẹp thành công! ===');

  if (updatedOrder?.status === 'paid' && ticket?.status === 'valid') {
    console.log('\n✅ ĐẠT YÊU CẦU: Luồng tạo đơn hàng, gọi cổng thanh toán sandbox và hoàn tất thanh toán sinh vé QR hoạt động thành công.');
  } else {
    console.log('\n❌ THẤT BẠI: Trạng thái đơn hàng hoặc vé không chuyển đổi chính xác!');
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Lỗi khi chạy payment qr test:', err);
  process.exit(1);
});
