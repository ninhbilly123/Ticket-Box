import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Cleaning up existing database records...');
  // Xóa dữ liệu cũ theo thứ tự quan hệ bảng
  await prisma.checkinLog.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.vipGuest.deleteMany();
  await prisma.ticket.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.ticketType.deleteMany();
  await prisma.concertArtist.deleteMany();
  await prisma.artist.deleteMany();
  await prisma.concert.deleteMany();
  await prisma.user.deleteMany();

  console.log('Creating seed users...');
  // 1. Tạo tài khoản Ban tổ chức (organizer)
  const organizer = await prisma.user.create({
    data: {
      email: 'organizer@ticketbox.com',
      passwordHash: '$2b$10$xyz...', // Giả lập mật khẩu đã hash
      fullName: 'Ban Tổ Chức Sky Tour',
      phone: '0987654321',
      role: 'organizer',
    },
  });
  console.log(`Created Organizer: ${organizer.fullName} (ID: ${organizer.id})`);

  // 2. Tạo tài khoản nhân viên soát vé (gate_staff)
  const staff = await prisma.user.create({
    data: {
      id: '7abe2001-f718-462d-b76a-18507d442df7',
      email: 'staff1@ticketbox.com',
      passwordHash: '$2b$10$xyz...',
      fullName: 'Nguyễn Văn Soát Vé',
      phone: '0912345678',
      role: 'gate_staff',
    },
  });
  console.log(`Created Staff: ${staff.fullName} (ID: ${staff.id})`);

  console.log('Creating seed artists...');
  // 3. Tạo nghệ sĩ (Artist)
  const artist = await prisma.artist.create({
    data: {
      name: 'Sơn Tùng M-TP',
      bioGenerated: 'Nghệ sĩ Sơn Tùng M-TP là ca sĩ, nhạc sĩ hàng đầu Việt Nam...',
      pdfSourceUrl: '/assets/presskits/sontung-mtp.pdf',
    },
  });
  console.log(`Created Artist: ${artist.name} (ID: ${artist.id})`);

  console.log('Creating seed concert...');
  // 4. Tạo Concert
  const concert = await prisma.concert.create({
    data: {
      organizerId: organizer.id,
      name: 'Sky Tour 2026',
      venue: 'Sân vận động Mỹ Đình, Hà Nội',
      startAt: new Date(Date.now() + 4 * 60 * 60 * 1000),
      saleOpenAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
      status: 'published',
      description: 'Concert tour diễn xuyên Việt hoành tráng nhất năm 2026 của Sơn Tùng M-TP.',
      svgSeatingMap: '/assets/seatmaps/skytour-seatmap.svg',
    },
  });
  console.log(`Created Concert: ${concert.name} (ID: ${concert.id})`);

  console.log('Linking concert with artist...');
  // 5. Liên kết Concert với Artist
  await prisma.concertArtist.create({
    data: {
      concertId: concert.id,
      artistId: artist.id,
    },
  });

  console.log('Creating ticket types for concert...');
  // 6. Tạo các phân hạng vé (TicketType)
  const ticketTypes = [
    {
      name: 'SVIP',
      price: 5000000,
      totalQuantity: 100,
      maxPerAccount: 2,
    },
    {
      name: 'VIP',
      price: 3000000,
      totalQuantity: 300,
      maxPerAccount: 4,
    },
    {
      name: 'CAT1',
      price: 2000000,
      totalQuantity: 500,
      maxPerAccount: 4,
    },
    {
      name: 'CAT2',
      price: 1500000,
      totalQuantity: 600,
      maxPerAccount: 4,
    },
    {
      name: 'GA',
      price: 800000,
      totalQuantity: 1000,
      maxPerAccount: 6,
    },
  ];

  for (const tt of ticketTypes) {
    await prisma.ticketType.create({
      data: {
        concertId: concert.id,
        name: tt.name,
        price: tt.price,
        totalQuantity: tt.totalQuantity,
        maxPerAccount: tt.maxPerAccount,
      },
    });
  }

  console.log('Creating a test audience user and purchasing tickets...');
  const customer = await prisma.user.create({
    data: {
      email: 'customer@ticketbox.com',
      passwordHash: '$2b$10$xyz...',
      fullName: 'Nguyễn Văn Khách Hàng',
      phone: '0933445566',
      role: 'audience',
    },
  });

  const svipType = await prisma.ticketType.findFirst({
    where: { concertId: concert.id, name: 'SVIP' },
  });

  if (svipType) {
    const order = await prisma.order.create({
      data: {
        userId: customer.id,
        concertId: concert.id,
        status: 'paid',
        totalAmount: 10000000,
        idempotencyKey: 'seed_order_idempotency_key_123',
        paidAt: new Date(),
      },
    });

    const orderItem = await prisma.orderItem.create({
      data: {
        orderId: order.id,
        ticketTypeId: svipType.id,
        quantity: 2,
        unitPrice: 5000000,
      },
    });

    const ticket1 = await prisma.ticket.create({
      data: {
        orderItemId: orderItem.id,
        userId: customer.id,
        qrCode: 'TEST-SVIP-001',
        status: 'valid',
      },
    });

    const ticket2 = await prisma.ticket.create({
      data: {
        orderItemId: orderItem.id,
        userId: customer.id,
        qrCode: 'TEST-SVIP-002',
        status: 'valid',
      },
    });

    console.log(`Created 2 test tickets: ${ticket1.qrCode} (ID: ${ticket1.id}), ${ticket2.qrCode} (ID: ${ticket2.id})`);
  }

  console.log('Creating seed VIP guests...');
  await prisma.vipGuest.create({
    data: {
      concertId: concert.id,
      fullName: 'Ông Nguyễn Văn A (VIP Guest)',
      identifier: '0901234567',
      zone: 'SVIP',
    },
  });
  await prisma.vipGuest.create({
    data: {
      concertId: concert.id,
      fullName: 'Bà Trần Thị B (VIP Guest)',
      identifier: '0909876543',
      zone: 'VIP',
    },
  });
  await prisma.vipGuest.create({
    data: {
      concertId: concert.id,
      fullName: 'Ca sĩ Khách Mời C (VIP Guest)',
      identifier: 'guest_c@gmail.com',
      zone: 'SVIP',
    },
  });

  console.log('Seeding process completed successfully!');
}

main()
  .catch((e) => {
    console.error('Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
