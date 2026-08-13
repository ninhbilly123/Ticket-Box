import { prisma } from '../src/shared/lib/prisma';
import { OrderHoldService } from '../src/modules/order/order-hold.service';

const orderHoldService = new OrderHoldService(prisma as any);

async function main() {
  console.log('=== Khởi chạy User Limit Test (IM03) ===');

  console.log('1. Khởi tạo dữ liệu Test...');
  const org = await prisma.organization.create({
    data: { name: `Test Org Limit ${Date.now()}` },
  });

  const organizer = await prisma.user.create({
    data: {
      email: `organizer-limit-${Date.now()}@example.com`,
      passwordHash: 'dummy-hash',
      fullName: 'Test Organizer Limit',
      role: 'ORGANIZER',
      organizationId: org.id,
      status: 'ACTIVE',
    },
  });

  const concert = await prisma.concert.create({
    data: {
      eventCode: `CONC-LIMIT-${Date.now()}`,
      organizerId: organizer.id,
      organizationId: org.id,
      name: 'Test Concert Limit',
      venue: 'Test Stadium',
      startAt: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
      saleOpenAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
      status: 'ON_SALE',
    },
  });

  const ticketType = await prisma.ticketType.create({
    data: {
      concertId: concert.id,
      name: 'VIP Limit Test',
      zoneCode: 'ZONE-VIP',
      price: 1500000,
      totalQuantity: 20,
      maxPerAccount: 2, // TỐI ĐA 2 VÉ TRÊN MỘT TÀI KHOẢN!
    },
  });

  await prisma.ticketInventory.create({
    data: {
      ticketTypeId: ticketType.id,
      totalQuantity: 20,
      availableQuantity: 20,
      reservedQuantity: 0,
      soldQuantity: 0,
    },
  });

  const user = await prisma.user.create({
    data: {
      email: `aud-limit-${Date.now()}@example.com`,
      passwordHash: 'dummy-hash',
      fullName: 'Limit Test Audience',
      role: 'AUDIENCE',
      status: 'ACTIVE',
    },
  });

  // 2. Tiến hành đặt giữ vé lần lượt
  console.log('2. Tiến hành giữ vé lần 1 (Số lượng: 1)...');
  const res1 = await orderHoldService.holdOrder({
    userId: user.id,
    concertId: concert.id,
    idempotencyKey: `idem-limit-1-${Date.now()}`,
    items: [{ ticketTypeId: ticketType.id, quantity: 1 }],
  });
  console.log('✅ Lần 1 thành công!');

  console.log('3. Tiến hành giữ vé lần 2 (Số lượng: 1)...');
  const res2 = await orderHoldService.holdOrder({
    userId: user.id,
    concertId: concert.id,
    idempotencyKey: `idem-limit-2-${Date.now()}`,
    items: [{ ticketTypeId: ticketType.id, quantity: 1 }],
  });
  console.log('✅ Lần 2 thành công!');

  console.log('4. Cố tình giữ vé lần 3 (Vượt quá giới hạn tối đa 2)...');
  let exceededLimit = false;
  try {
    await orderHoldService.holdOrder({
      userId: user.id,
      concertId: concert.id,
      idempotencyKey: `idem-limit-3-${Date.now()}`,
      items: [{ ticketTypeId: ticketType.id, quantity: 1 }],
    });
  } catch (error: any) {
    if (error.errorCode === 'USER_TICKET_LIMIT_EXCEEDED') {
      exceededLimit = true;
      console.log('✅ Hệ thống chặn thành công với mã lỗi:', error.errorCode);
    } else {
      console.log('❌ Lỗi không mong đợi:', error.message);
    }
  }

  // 5. Dọn dẹp dữ liệu
  console.log('\n5. Đang dọn dẹp dữ liệu test...');
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

  if (exceededLimit) {
    console.log('\n✅ ĐẠT YÊU CẦU: Hệ thống kiểm soát và chặn đứng thành công hành vi mua vượt giới hạn số vé trên một tài khoản (Per-user limit).');
  } else {
    console.log('\n❌ THẤT BẠI: Người dùng vẫn giữ được nhiều vé hơn giới hạn cho phép!');
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Lỗi khi chạy limit test:', err);
  process.exit(1);
});
