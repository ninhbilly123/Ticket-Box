import app from '../src/app';
import { prisma } from '../src/shared/lib/prisma';
import jwt from 'jsonwebtoken';
import http from 'http';

async function requestJson(url: string, options: http.RequestOptions, body?: any): Promise<{ status: number; data: any }> {
  return new Promise((resolve, reject) => {
    const req = http.request(url, options, (res) => {
      let responseBody = '';
      res.on('data', (chunk) => { responseBody += chunk; });
      res.on('end', () => {
        try {
          resolve({
            status: res.statusCode || 0,
            data: responseBody ? JSON.parse(responseBody) : {},
          });
        } catch {
          resolve({ status: res.statusCode || 0, data: responseBody });
        }
      });
    });
    req.on('error', reject);
    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

async function main() {
  console.log('=== Khởi chạy Idempotency Middleware Test (IM14) ===');

  const jwtSecret = process.env.JWT_SECRET || 'test-secret';

  // 1. Thiết lập dữ liệu Concert và Ticket Type
  console.log('1. Thiết lập dữ liệu Concert, Ticket Type và Orders...');
  const org = await prisma.organization.create({
    data: { name: `Test Org Idem Pay ${Date.now()}` },
  });

  const organizer = await prisma.user.create({
    data: {
      email: `organizer-idem-pay-${Date.now()}@example.com`,
      passwordHash: 'dummy',
      fullName: 'Organizer Idempotency Pay',
      role: 'ORGANIZER',
      organizationId: org.id,
      status: 'ACTIVE',
    },
  });

  const concert = await prisma.concert.create({
    data: {
      eventCode: `CONC-IDEM-PAY-${Date.now()}`,
      organizerId: organizer.id,
      organizationId: org.id,
      name: 'Idempotency Pay Test Concert',
      venue: 'Arena',
      startAt: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
      saleOpenAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
      status: 'ON_SALE',
    },
  });

  const ticketType = await prisma.ticketType.create({
    data: {
      concertId: concert.id,
      name: 'VIP Idempotency Pay',
      zoneCode: 'ZONE-VIP',
      price: 100000,
      totalQuantity: 100,
      maxPerAccount: 5,
    },
  });

  await prisma.ticketInventory.create({
    data: {
      ticketTypeId: ticketType.id,
      totalQuantity: 100,
      availableQuantity: 100,
      reservedQuantity: 0,
      soldQuantity: 0,
    },
  });

  const user = await prisma.user.create({
    data: {
      email: `aud-idem-pay-${Date.now()}@example.com`,
      passwordHash: 'dummy',
      fullName: 'Idempotency Pay Audience',
      role: 'AUDIENCE',
      status: 'ACTIVE',
    },
  });

  // Tạo 2 Đơn hàng (Pending) để test các kịch bản
  const order1 = await prisma.order.create({
    data: {
      userId: user.id,
      concertId: concert.id,
      status: 'pending',
      totalAmount: 100000,
      idempotencyKey: `idem-order-key-1-${Date.now()}`,
    },
  });

  const order2 = await prisma.order.create({
    data: {
      userId: user.id,
      concertId: concert.id,
      status: 'pending',
      totalAmount: 100000,
      idempotencyKey: `idem-order-key-2-${Date.now()}`,
    },
  });

  const token = jwt.sign(
    { sub: user.id, email: user.email, role: 'AUDIENCE', organizationId: null },
    jwtSecret,
    { expiresIn: '1h' }
  );

  // 2. Khởi chạy Express Server động
  console.log('2. Khởi chạy API Server trên cổng ngẫu nhiên...');
  const server = app.listen(0);
  const address = server.address();
  if (!address || typeof address !== 'object') {
    throw new Error('Failed to bind server port');
  }
  const baseUrl = `http://127.0.0.1:${address.port}`;
  console.log(`- Server đang chạy tại: ${baseUrl}`);

  const paymentUrl = `${baseUrl}/api/v1/payments`;
  const baseOptions = {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'authorization': `Bearer ${token}`,
    },
  };

  // --- PHẦN 1: TEST CONCURRENT RETRY (Thanh toán cùng lúc chung key) ---
  console.log('\n3. [Test Concurrent] Gửi đồng thời 2 request thanh toán cùng chung 1 Idempotency-Key...');
  const concurrentKey = `idem-pay-concurrent-${Date.now()}`;
  const concurrentOpts = {
    ...baseOptions,
    headers: { ...baseOptions.headers, 'idempotency-key': concurrentKey },
  };
  const body1 = { orderId: order1.id, gateway: 'vnpay' };

  const [res1, res2] = await Promise.all([
    requestJson(paymentUrl, concurrentOpts, body1),
    requestJson(paymentUrl, concurrentOpts, body1),
  ]);

  console.log(`- Request A: HTTP Status = ${res1.status}`);
  console.log(`- Request B: HTTP Status = ${res2.status}`);

  // Kỳ vọng: 1 cái được xử lý thành công (201) và 1 cái bị chặn 409 (IDEMPOTENCY_CONFLICT)
  const hasSuccess = res1.status === 201 || res2.status === 201;
  const hasConflict = res1.status === 409 || res2.status === 409;
  const conflictMessage = (res1.status === 409 ? res1.data : res2.data)?.error?.code;

  if (hasSuccess && hasConflict && conflictMessage === 'IDEMPOTENCY_CONFLICT') {
    console.log('✅ ĐẠT: Gửi đồng thời thanh toán cùng key bị chặn 409 Conflict thành công.');
  } else {
    console.error('❌ THẤT BẠI: Gửi đồng thời thanh toán cùng key không được xử lý đúng (Kỳ vọng: 1 cái 201, 1 cái 409 IDEMPOTENCY_CONFLICT).');
  }

  // --- PHẦN 2: TEST SEQUENTIAL RETRY (Gửi lại request sau khi request đầu đã hoàn tất) ---
  console.log('\n4. [Test Retry/Same Key] Gửi request thanh toán lần đầu tiên...');
  const sequentialKey = `idem-pay-seq-${Date.now()}`;
  const seqOpts = {
    ...baseOptions,
    headers: { ...baseOptions.headers, 'idempotency-key': sequentialKey },
  };
  const body2 = { orderId: order2.id, gateway: 'vnpay' };

  const seqRes1 = await requestJson(paymentUrl, seqOpts, body2);
  const paymentId1 = seqRes1.data?.data?.paymentId;
  console.log(`- Lần 1: HTTP Status = ${seqRes1.status}, Payment ID = ${paymentId1}`);

  console.log('5. Gửi lại chính xác request thanh toán đó (cùng body và cùng Idempotency-Key)...');
  const seqRes2 = await requestJson(paymentUrl, seqOpts, body2);
  const paymentId2 = seqRes2.data?.data?.paymentId;
  console.log(`- Lần 2 (Retry): HTTP Status = ${seqRes2.status}, Payment ID = ${paymentId2}`);

  // Kỳ vọng: Phản hồi của lần 2 trùng khớp lần 1 và không tạo thêm bản ghi Payment trùng lặp trong DB
  const isDuplicateSaved = seqRes1.status === 201 && seqRes2.status === 201 && paymentId1 === paymentId2;

  // Đếm số lượng bản ghi Payment liên kết với concert này
  const dbPaymentsCount = await prisma.payment.count({
    where: { order: { concertId: concert.id } },
  });
  console.log(`- Tổng số bản ghi Payment được tạo trong DB: ${dbPaymentsCount} (Kỳ vọng: 2 bản ghi)`);

  if (isDuplicateSaved && dbPaymentsCount === 2) {
    console.log('✅ ĐẠT: Gửi lại cùng key trả về đúng dữ liệu cache cũ, không tạo giao dịch thanh toán trùng lặp trong DB.');
  } else {
    console.error('❌ THẤT BẠI: Gửi lại cùng key bị tạo giao dịch mới hoặc không trả về đúng kết quả cache.');
  }

  // 6. Dọn dẹp dữ liệu
  console.log('\n6. Đang dọn dẹp dữ liệu test...');
  server.close();

  // Xóa các bản ghi liên kết
  await prisma.payment.deleteMany({
    where: { order: { concertId: concert.id } },
  });

  const ids = [order1.id, order2.id];
  await prisma.orderItem.deleteMany({ where: { orderId: { in: ids } } });
  await prisma.order.deleteMany({ where: { id: { in: ids } } });

  await prisma.ticketInventory.delete({ where: { ticketTypeId: ticketType.id } });
  await prisma.ticketType.delete({ where: { id: ticketType.id } });
  await prisma.concert.delete({ where: { id: concert.id } });
  await prisma.user.deleteMany({ where: { id: { in: [user.id, organizer.id] } } });
  await prisma.organization.delete({ where: { id: org.id } });

  console.log('=== Dọn dẹp thành công! ===');

  if (hasSuccess && hasConflict && isDuplicateSaved && dbPaymentsCount === 2) {
    console.log('\n✅ KẾT LUẬN: Hệ thống Idempotency hoạt động HOÀN HẢO! Chống trùng lặp tuyệt đối cả khi request đồng thời và khi retry.');
  } else {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Lỗi khi chạy idempotency test:', err);
  process.exit(1);
});
