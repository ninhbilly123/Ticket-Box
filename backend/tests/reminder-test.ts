import { prisma } from '../src/shared/lib/prisma';
import { runConcertReminderScan } from '../src/workers/concert-reminder.worker';

async function main() {
  console.log('=== Khởi chạy Concert Reminder Scheduler Test (IM04) ===');

  console.log('1. Khởi tạo dữ liệu Test...');
  const org = await prisma.organization.create({
    data: { name: `Test Org Reminder ${Date.now()}` },
  });

  const organizer = await prisma.user.create({
    data: {
      email: `organizer-reminder-${Date.now()}@example.com`,
      passwordHash: 'dummy-hash',
      fullName: 'Test Organizer Reminder',
      role: 'ORGANIZER',
      organizationId: org.id,
      status: 'ACTIVE',
    },
  });

  // Concert bắt đầu sau đúng 24 giờ và 10 phút (nằm trong cửa sổ quét gte 24h và < 24h30m)
  const concert = await prisma.concert.create({
    data: {
      eventCode: `CONC-REM-${Date.now()}`,
      organizerId: organizer.id,
      organizationId: org.id,
      name: 'Test Concert 24h Reminder',
      venue: 'Reminder Test Stadium',
      startAt: new Date(Date.now() + 24 * 60 * 60 * 1000 + 10 * 60 * 1000), // 24h 10 phút sau
      saleOpenAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
      status: 'ON_SALE',
    },
  });

  const ticketType = await prisma.ticketType.create({
    data: {
      concertId: concert.id,
      name: 'GA Reminder Test',
      zoneCode: 'ZONE-GA',
      price: 500000,
      totalQuantity: 10,
      maxPerAccount: 5,
    },
  });

  const user = await prisma.user.create({
    data: {
      email: `aud-reminder-${Date.now()}@example.com`,
      passwordHash: 'dummy-hash',
      fullName: 'Reminder Test Audience',
      role: 'AUDIENCE',
      status: 'ACTIVE',
    },
  });

  // Tạo đơn hàng PAID và vé VALID cho user
  const order = await prisma.order.create({
    data: {
      userId: user.id,
      concertId: concert.id,
      status: 'paid',
      totalAmount: 500000,
      idempotencyKey: `idem-reminder-test-${Date.now()}`,
      orderItems: {
        create: {
          ticketTypeId: ticketType.id,
          quantity: 1,
          unitPrice: 500000,
        },
      },
    },
    include: {
      orderItems: true,
    },
  });

  const orderItem = order.orderItems[0];
  await prisma.ticket.create({
    data: {
      orderItemId: orderItem.id,
      userId: user.id,
      seatNumber: 'GA-TEST-01',
      qrCode: `TICKET-REM-TEST-${Date.now()}`,
      status: 'valid',
    },
  });

  // 2. Chạy quét thông báo nhắc nhở 24h
  console.log('2. Kích hoạt chạy tiến trình quét nhắc nhở...');
  // Cài đặt biến môi trường giả lập thời gian để khớp
  process.env.CONCERT_REMINDER_HOURS_BEFORE = '24';
  process.env.CONCERT_REMINDER_LOOKAHEAD_MINUTES = '30';

  await runConcertReminderScan();

  // 3. Kiểm tra xem log thông báo đã được lưu trong database chưa
  console.log('3. Truy vấn kiểm tra logs thông báo trong Database...');
  const notifications = await prisma.notification.findMany({
    where: {
      userId: user.id,
      concertId: concert.id,
      type: 'concert_reminder_24h',
    },
  });

  console.log(`- Tìm thấy ${notifications.length} bản ghi thông báo nhắc nhở.`);

  const emailNotification = notifications.find((n) => n.channel === 'email');
  const appNotification = notifications.find((n) => n.channel === 'app');

  console.log(`- Trạng thái kênh email: ${emailNotification?.status || 'Không tìm thấy'}`);
  console.log(`- Trạng thái kênh app: ${appNotification?.status || 'Không tìm thấy'}`);

  // 4. Dọn dẹp dữ liệu
  console.log('\n4. Đang dọn dẹp dữ liệu test...');
  await prisma.notification.deleteMany({ where: { concertId: concert.id } });
  await prisma.ticket.deleteMany({ where: { orderItemId: orderItem.id } });
  await prisma.orderItem.deleteMany({ where: { orderId: order.id } });
  await prisma.order.deleteMany({ where: { id: order.id } });
  await prisma.ticketType.delete({ where: { id: ticketType.id } });
  await prisma.concert.delete({ where: { id: concert.id } });
  await prisma.user.deleteMany({ where: { id: { in: [user.id, organizer.id] } } });
  await prisma.organization.delete({ where: { id: org.id } });

  console.log('=== Dọn dẹp thành công! ===');

  if (emailNotification && appNotification) {
    console.log('\n✅ ĐẠT YÊU CẦU: Hệ thống tự động chạy ngầm lập lịch nhắc nhở trước 24h thành công và lưu vết kênh gửi trong Database.');
  } else {
    console.log('\n❌ THẤT BẠI: Không phát sinh bản ghi thông báo nhắc nhở 24h!');
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Lỗi khi chạy reminder test:', err);
  process.exit(1);
});
