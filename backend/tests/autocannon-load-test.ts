import app from '../src/app';
import { prisma } from '../src/shared/lib/prisma';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
const autocannon = require('autocannon');

async function main() {
  console.log('=== Khởi chạy Autocannon Concurrency Load Test ===');

  // Tạm thời tăng giới hạn Rate Limit trong quá trình chạy Load Test để tránh bị block 429
  process.env.HOLD_ORDER_USER_RATE_LIMIT = '1000';
  process.env.HOLD_ORDER_IP_RATE_LIMIT = '1000';

  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    console.error('Lỗi: Cần cấu hình biến môi trường JWT_SECRET để ký token.');
    process.exit(1);
  }

  // 1. Tạo tổ chức và concert thử nghiệm
  console.log('1. Thiết lập Concert và cấu hình tồn kho (GA = 100 vé)...');
  const org = await prisma.organization.create({
    data: { name: `Test Org Autocannon ${Date.now()}` },
  });

  const organizer = await prisma.user.create({
    data: {
      email: `organizer-ac-${Date.now()}@example.com`,
      passwordHash: 'dummy',
      fullName: 'Organizer Autocannon',
      role: 'ORGANIZER',
      organizationId: org.id,
      status: 'ACTIVE',
    },
  });

  const concert = await prisma.concert.create({
    data: {
      eventCode: `CONC-AC-${Date.now()}`,
      organizerId: organizer.id,
      organizationId: org.id,
      name: 'Autocannon Concert Load Test',
      venue: 'Autocannon Arena',
      startAt: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
      saleOpenAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
      status: 'ON_SALE',
    },
  });

  const ticketType = await prisma.ticketType.create({
    data: {
      concertId: concert.id,
      name: 'GA Load Test',
      zoneCode: 'ZONE-GA',
      price: 100000,
      totalQuantity: 100,
      maxPerAccount: 50, // Đảm bảo giới hạn cá nhân không bị vi phạm khi test 100 vé với 10 users
    },
  });

  // Tồn kho đúng 100 vé
  await prisma.ticketInventory.create({
    data: {
      ticketTypeId: ticketType.id,
      totalQuantity: 100,
      availableQuantity: 100,
      reservedQuantity: 0,
      soldQuantity: 0,
    },
  });

  // 2. Tạo 10 tài khoản Audience và ký JWT tokens
  console.log('2. Đang tạo 10 tài khoản Audience giả lập và ký JWT...');
  const tokens: string[] = [];
  const users = [];

  for (let i = 0; i < 10; i++) {
    const user = await prisma.user.create({
      data: {
        email: `aud-ac-${i}-${Date.now()}@example.com`,
        passwordHash: 'dummy',
        fullName: `Audience AC ${i}`,
        role: 'AUDIENCE',
        status: 'ACTIVE',
      },
    });
    users.push(user);

    const token = jwt.sign(
      {
        sub: user.id,
        email: user.email,
        role: 'AUDIENCE',
        organizationId: null,
      },
      jwtSecret,
      { expiresIn: '1h' }
    );
    tokens.push(token);
  }

  // 3. Khởi chạy Express Server động
  console.log('3. Khởi chạy API Server trên cổng ngẫu nhiên...');
  const server = app.listen(0);
  const address = server.address();
  if (!address || typeof address !== 'object') {
    throw new Error('Failed to bind server port');
  }
  const baseUrl = `http://127.0.0.1:${address.port}`;
  console.log(`- Server đang lắng nghe tại: ${baseUrl}`);

  // 4. Thiết lập 200 HTTP requests với Idempotency-Key và JWT khác nhau
  console.log('4. Chuẩn bị 200 HTTP requests đặt giữ vé song song...');
  const requests: any[] = [];
  for (let i = 0; i < 200; i++) {
    requests.push({
      method: 'POST',
      path: '/api/v1/orders/hold',
      headers: {
        'content-type': 'application/json',
        'authorization': `Bearer ${tokens[i % tokens.length]}`,
      },
      body: JSON.stringify({
        concertId: concert.id,
        items: [{ ticketTypeId: ticketType.id, quantity: 1 }],
      }),
      // Sử dụng hook setupRequest của Autocannon để sinh Idempotency-Key động trước khi render request buffer
      setupRequest: (req: any) => {
        req.headers['idempotency-key'] = `idem-ac-${crypto.randomUUID()}`;
        return req;
      }
    });
  }

  // 5. Chạy Autocannon Load Test
  console.log('5. Đang chạy Autocannon Load Test (10 connections, 200 requests)...');
  try {
    const result = await autocannon({
      url: baseUrl,
      connections: 10,
      amount: 200,
      requests,
    });

    console.log('\n=== KẾT QUẢ TẢI AUTOCANNON ===');
    console.log(`- Tổng số request hoàn tất: ${result.requests.sent}`);
    console.log(`- Lượng băng thông: ${result.throughput.average} bytes/s`);
    console.log(`- Thời gian trung bình (Latency): ${result.latency.average} ms`);
    console.log(`- Số request lỗi (Non-2xx): ${result.non2xx}`);
    console.log(`- Số request thành công (2xx): ${result.requests.sent - result.non2xx}`);

    // Kiểm tra kho vé thực tế trong DB
    const finalInventory = await prisma.ticketInventory.findUnique({
      where: { ticketTypeId: ticketType.id },
    });

    console.log('\n=== TRẠNG THÁI KHO VÉ SAU KHI TẢI ===');
    console.log(`- Tồn kho khả dụng còn lại: ${finalInventory?.availableQuantity}`);
    console.log(`- Tồn kho được giữ chỗ: ${finalInventory?.reservedQuantity}`);

    if (finalInventory?.availableQuantity === 0 && finalInventory?.reservedQuantity === 100) {
      console.log('\n✅ ĐẠT YÊU CẦU: Autocannon đã bắn 200 request liên tục, PostgreSQL Lock chặn đứng ở đúng 100 vé thành công, không hề bị bán lố!');
    } else {
      console.log('\n❌ THẤT BẠI: Phát hiện bán lố vé hoặc dữ liệu tồn kho bị sai lệch!');
    }

  } catch (error) {
    console.error('Lỗi khi chạy Autocannon:', error);
  } finally {
    // 6. Dọn dẹp dữ liệu
    console.log('\n6. Đang dọn dẹp dữ liệu test...');
    server.close();

    const orderIds = await prisma.order.findMany({
      where: { concertId: concert.id },
      select: { id: true },
    });
    const ids = orderIds.map((o) => o.id);

    if (ids.length > 0) {
      await prisma.ticket.deleteMany({ where: { orderItem: { orderId: { in: ids } } } });
      await prisma.orderItem.deleteMany({ where: { orderId: { in: ids } } });
      await prisma.order.deleteMany({ where: { id: { in: ids } } });
    }

    await prisma.ticketInventory.delete({ where: { ticketTypeId: ticketType.id } });
    await prisma.ticketType.delete({ where: { id: ticketType.id } });
    await prisma.concert.delete({ where: { id: concert.id } });
    await prisma.user.deleteMany({ where: { id: { in: [...users.map((u) => u.id), organizer.id] } } });
    await prisma.organization.delete({ where: { id: org.id } });

    console.log('=== Dọn dẹp thành công! ===');
    process.exit(0);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
