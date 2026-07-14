import { prisma } from '../src/shared/lib/prisma';
import { OrderHoldService } from '../src/modules/order/order-hold.service';
import crypto from 'crypto';

const orderHoldService = new OrderHoldService();

async function main() {
  console.log('=== Khởi chạy Concurrency Test (Anti-Overselling) ===');

  // 1. Tạo tổ chức và người dùng phục vụ test
  console.log('1. Khởi tạo dữ liệu Test...');
  const org = await prisma.organization.create({
    data: { name: `Test Org Concurrency ${Date.now()}` },
  });

  const organizer = await prisma.user.create({
    data: {
      email: `organizer-concurrency-${Date.now()}@example.com`,
      passwordHash: 'dummy-hash',
      fullName: 'Test Organizer Concurrency',
      role: 'ORGANIZER',
      organizationId: org.id,
      status: 'ACTIVE',
    },
  });

  const concert = await prisma.concert.create({
    data: {
      eventCode: `CONC-CURR-${Date.now()}`,
      organizerId: organizer.id,
      organizationId: org.id,
      name: 'Test Concert Concurrency',
      venue: 'Test Stadium',
      startAt: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
      saleOpenAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // đã mở bán
      status: 'ON_SALE',
    },
  });

  const ticketType = await prisma.ticketType.create({
    data: {
      concertId: concert.id,
      name: 'GA Concurrency',
      zoneCode: 'ZONE-GA',
      price: 500000,
      totalQuantity: 100,
      maxPerAccount: 5,
    },
  });

  // Tạo hàng tồn kho chỉ có đúng 1 vé khả dụng
  const inventory = await prisma.ticketInventory.create({
    data: {
      ticketTypeId: ticketType.id,
      totalQuantity: 100,
      availableQuantity: 1, // CHỈ CÓ 1 VÉ DUY NHẤT!
      reservedQuantity: 0,
      soldQuantity: 0,
    },
  });

  // 2. Tạo 100 user khán giả đồng thời
  console.log('2. Đang tạo 100 tài khoản Audience giả lập...');
  const users = [];
  for (let i = 0; i < 100; i++) {
    users.push(
      prisma.user.create({
        data: {
          email: `aud-concurrency-${i}-${Date.now()}@example.com`,
          passwordHash: 'dummy-hash',
          fullName: `Audience User ${i}`,
          role: 'AUDIENCE',
          status: 'ACTIVE',
        },
      })
    );
  }
  const createdUsers = await Promise.all(users);

  // 3. Giả lập 100 người dùng nhấn giữ vé cùng 1 lúc
  console.log('3. Gửi đồng thời 100 yêu cầu giữ vé (Promise.allSettled)...');
  const tasks = createdUsers.map((user, index) => {
    return orderHoldService.holdOrder({
      userId: user.id,
      concertId: concert.id,
      idempotencyKey: `idem-concurrency-${index}-${Date.now()}`,
      items: [{ ticketTypeId: ticketType.id, quantity: 1 }],
    });
  });

  const results = await Promise.allSettled(tasks);

  // 4. Phân tích kết quả
  let successCount = 0;
  let failCount = 0;
  let soldOutCount = 0;

  for (const res of results) {
    if (res.status === 'fulfilled') {
      successCount++;
    } else {
      failCount++;
      const errMsg = res.reason?.message || '';
      const errCode = res.reason?.errorCode || '';
      if (errCode === 'TICKET_SOLD_OUT' || errMsg.includes('hết')) {
        soldOutCount++;
      }
    }
  }

  console.log('\n=== KẾT QUẢ KIỂM THỬ ĐỒNG THỜI ===');
  console.log(`- Tổng số yêu cầu gửi lên: ${tasks.length}`);
  console.log(`- Số yêu cầu giữ vé THÀNH CÔNG: ${successCount}`);
  console.log(`- Số yêu cầu giữ vé THẤT BẠI: ${failCount}`);
  console.log(`- Số yêu cầu báo lỗi HẾT VÉ (TICKET_SOLD_OUT): ${soldOutCount}`);

  // 5. Kiểm tra tính toàn vẹn tồn kho
  const finalInventory = await prisma.ticketInventory.findUnique({
    where: { ticketTypeId: ticketType.id },
  });

  console.log('\n=== TRẠNG THÁI KHO VÉ SAU KHI TEST ===');
  console.log(`- Tồn kho khả dụng (availableQuantity): ${finalInventory?.availableQuantity}`);
  console.log(`- Tồn kho giữ chỗ (reservedQuantity): ${finalInventory?.reservedQuantity}`);

  // 6. Dọn dẹp dữ liệu
  console.log('\n6. Đang dọn dẹp dữ liệu test...');
  // Xóa tickets, order items, orders trước do ràng buộc khóa ngoại
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

  const userIds = createdUsers.map((u) => u.id);
  await prisma.user.deleteMany({ where: { id: { in: [...userIds, organizer.id] } } });
  await prisma.organization.delete({ where: { id: org.id } });

  console.log('=== Dọn dẹp thành công! ===');

  // Khẳng định kết quả
  if (successCount === 1 && finalInventory?.reservedQuantity === 1) {
    console.log('\n✅ ĐẠT YÊU CẦU: Khóa bi quan PostgreSQL (FOR UPDATE) hoạt động chính xác. Chỉ duy nhất 1 giao dịch thành công, không xảy ra bán lố (Overselling).');
  } else {
    console.log('\n❌ THẤT BẠI: Phát hiện bán lố vé hoặc sai lệch số lượng thành công!');
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Lỗi khi chạy concurrency test:', err);
  process.exit(1);
});
