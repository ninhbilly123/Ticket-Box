import { prisma } from '../src/shared/lib/prisma';
import { OrderHoldService } from '../src/modules/order/order-hold.service';

const orderHoldService = new OrderHoldService();

async function main() {
  console.log('=== Khởi chạy User Limit Concurrency Test (IM03) ===');

  console.log('1. Khởi tạo dữ liệu Test...');
  const org = await prisma.organization.create({
    data: { name: `Test Org User Limit Concurrency ${Date.now()}` },
  });

  const organizer = await prisma.user.create({
    data: {
      email: `organizer-limit-curr-${Date.now()}@example.com`,
      passwordHash: 'dummy-hash',
      fullName: 'Test Organizer Limit Concurrency',
      role: 'ORGANIZER',
      organizationId: org.id,
      status: 'ACTIVE',
    },
  });

  const concert = await prisma.concert.create({
    data: {
      eventCode: `CONC-LIMIT-CURR-${Date.now()}`,
      organizerId: organizer.id,
      organizationId: org.id,
      name: 'Test Concert Limit Concurrency',
      venue: 'Test Stadium',
      startAt: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
      saleOpenAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
      status: 'ON_SALE',
    },
  });

  const ticketType = await prisma.ticketType.create({
    data: {
      concertId: concert.id,
      name: 'VIP Limit Concurrency Test',
      zoneCode: 'ZONE-VIP-CURR',
      price: 1500000,
      totalQuantity: 10,
      maxPerAccount: 2, // TỐI ĐA 2 VÉ TRÊN MỘT TÀI KHOẢN!
    },
  });

  await prisma.ticketInventory.create({
    data: {
      ticketTypeId: ticketType.id,
      totalQuantity: 10,
      availableQuantity: 10,
      reservedQuantity: 0,
      soldQuantity: 0,
    },
  });

  const user = await prisma.user.create({
    data: {
      email: `aud-limit-curr-${Date.now()}@example.com`,
      passwordHash: 'dummy-hash',
      fullName: 'Limit Concurrency Test Audience',
      role: 'AUDIENCE',
      status: 'ACTIVE',
    },
  });

  // 2. Gửi đồng thời 5 yêu cầu giữ vé (mỗi yêu cầu mua 1 vé)
  console.log('2. Gửi đồng thời 5 yêu cầu giữ vé (mỗi yêu cầu 1 vé, giới hạn tối đa 2)...');
  const tasks = [];
  for (let i = 0; i < 5; i++) {
    tasks.push(
      orderHoldService.holdOrder({
        userId: user.id,
        concertId: concert.id,
        idempotencyKey: `idem-limit-curr-${i}-${Date.now()}`,
        items: [{ ticketTypeId: ticketType.id, quantity: 1 }],
      })
    );
  }

  const results = await Promise.allSettled(tasks);

  // 3. Phân tích kết quả
  let successCount = 0;
  let failCount = 0;
  let limitExceededCount = 0;

  results.forEach((res, index) => {
    if (res.status === 'fulfilled') {
      successCount++;
      console.log(`- Request ${index + 1}: THÀNH CÔNG`);
    } else {
      failCount++;
      const errMsg = res.reason?.message || '';
      const errCode = res.reason?.errorCode || '';
      console.log(`- Request ${index + 1}: THẤT BẠI - Mã lỗi: ${errCode} | Chi tiết: ${errMsg}`);
      if (errCode === 'USER_TICKET_LIMIT_EXCEEDED') {
        limitExceededCount++;
      }
    }
  });

  console.log('\n=== KẾT QUẢ KIỂM THỬ ĐỒNG THỜI GIỚI HẠN VÉ ===');
  console.log(`- Tổng số yêu cầu gửi lên: ${tasks.length}`);
  console.log(`- Số yêu cầu giữ vé THÀNH CÔNG: ${successCount}`);
  console.log(`- Số yêu cầu giữ vé THẤT BẠI: ${failCount}`);
  console.log(`- Số yêu cầu bị chặn do vượt giới hạn (USER_TICKET_LIMIT_EXCEEDED): ${limitExceededCount}`);

  // 4. Dọn dẹp dữ liệu
  console.log('\n4. Đang dọn dẹp dữ liệu test...');
  const orderIds = await prisma.order.findMany({
    where: { concertId: concert.id },
    select: { id: true },
  });
  const ids = orderIds.map((o) => o.id);

  if (ids.length > 0) {
    await prisma.ticket.deleteMany({ where: { orderItemId: { in: (await prisma.orderItem.findMany({ where: { orderId: { in: ids } }, select: { id: true } })).map(oi => oi.id) } } });
    await prisma.orderItem.deleteMany({ where: { orderId: { in: ids } } });
    await prisma.order.deleteMany({ where: { id: { in: ids } } });
  }

  await prisma.ticketInventory.delete({ where: { ticketTypeId: ticketType.id } });
  await prisma.ticketType.delete({ where: { id: ticketType.id } });
  await prisma.concert.delete({ where: { id: concert.id } });
  await prisma.user.deleteMany({ where: { id: { in: [user.id, organizer.id] } } });
  await prisma.organization.delete({ where: { id: org.id } });

  console.log('=== Dọn dẹp thành công! ===');

  if (successCount === 2 && limitExceededCount === 3) {
    console.log('\n✅ ĐẠT YÊU CẦU: Hệ thống kiểm soát và chặn đứng thành công hành vi lách giới hạn vé cá nhân (Per-user limit) dưới tải đồng thời.');
  } else {
    console.log('\n❌ THẤT BẠI: Kết quả không như mong đợi! (Cần thành công đúng 2 và bị chặn 3 do vượt giới hạn)');
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Lỗi khi chạy concurrency limit test:', err);
  process.exit(1);
});
