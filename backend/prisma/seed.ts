import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const PASSWORD = 'Password123!';
const STAFF_ID = '7abe2001-f718-462d-b76a-18507d442df7';
const AUDIENCE_ID = '11111111-1111-4111-8111-111111111111';

const ticketCatalog = [
  { name: 'SVIP', price: 5000000, totalQuantity: 100, maxPerAccount: 2 },
  { name: 'VIP', price: 3000000, totalQuantity: 300, maxPerAccount: 4 },
  { name: 'CAT1', price: 2000000, totalQuantity: 500, maxPerAccount: 4 },
  { name: 'CAT2', price: 1500000, totalQuantity: 600, maxPerAccount: 4 },
  { name: 'GA', price: 800000, totalQuantity: 1000, maxPerAccount: 6 },
];

async function resetDatabase() {
  await prisma.auditLog.deleteMany();
  await prisma.whitelistEmailConfig.deleteMany();
  await prisma.staffAssignment.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.checkinLog.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.vipGuest.deleteMany();
  await prisma.ticket.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.ticketInventory.deleteMany();
  await prisma.ticketType.deleteMany();
  await prisma.concertArtist.deleteMany();
  await prisma.artist.deleteMany();
  await prisma.concert.deleteMany();
  await prisma.user.deleteMany();
  await prisma.organization.deleteMany();
}

async function createTicketTypes(concertId: string) {
  for (const item of ticketCatalog) {
    const ticketType = await prisma.ticketType.create({
      data: {
        concertId,
        name: item.name,
        price: item.price,
        totalQuantity: item.totalQuantity,
        maxPerAccount: item.maxPerAccount,
        status: 'ACTIVE',
      },
    });

    await prisma.ticketInventory.create({
      data: {
        ticketTypeId: ticketType.id,
        totalQuantity: item.totalQuantity,
        availableQuantity: item.totalQuantity,
        reservedQuantity: 0,
        soldQuantity: 0,
      },
    });
  }
}

async function main() {
  console.log('Cleaning database...');
  await resetDatabase();

  const passwordHash = await bcrypt.hash(PASSWORD, 10);

  console.log('Creating organizations and users...');
  const organization = await prisma.organization.create({
    data: { name: 'Demo Organizer' },
  });

  const admin = await prisma.user.create({
    data: {
      email: 'admin@example.com',
      passwordHash,
      fullName: 'TicketBox Admin',
      role: 'ADMIN',
      status: 'ACTIVE',
    },
  });

  const organizer = await prisma.user.create({
    data: {
      email: 'organizer@example.com',
      passwordHash,
      fullName: 'Demo Organizer Manager',
      phone: '0987654321',
      role: 'ORGANIZER',
      organizationId: organization.id,
      status: 'ACTIVE',
    },
  });

  const staff = await prisma.user.create({
    data: {
      id: STAFF_ID,
      email: 'staff@example.com',
      passwordHash,
      fullName: 'Demo Check-in Staff',
      phone: '0912345678',
      role: 'CHECKIN_STAFF',
      organizationId: organization.id,
      status: 'ACTIVE',
    },
  });

  const audience = await prisma.user.create({
    data: {
      id: AUDIENCE_ID,
      email: 'audience@example.com',
      passwordHash,
      fullName: 'Demo Audience',
      phone: '0933445566',
      role: 'AUDIENCE',
      status: 'ACTIVE',
    },
  });

  console.log('Creating artists and concerts...');
  const artists = await Promise.all(
    ['Anh Trai Say Hi', 'Anh Trai Vuot Ngan Chong Gai', 'Em Xinh Say Hi', 'Chi Dep Dap Gio Re Song'].map((name) =>
      prisma.artist.create({
        data: {
          name,
          bioGenerated: `${name} is a seeded TicketBox artist profile for demo.`,
          pdfSourceUrl: `/assets/presskits/${name.toLowerCase().replace(/\s+/g, '-')}.pdf`,
          bioUpdatedAt: new Date(),
        },
      })
    )
  );

  const now = Date.now();
  const concerts = await Promise.all(
    artists.map((artist, index) =>
      prisma.concert.create({
        data: {
          organizerId: organizer.id,
          organizationId: organization.id,
          name: artist.name,
          venue: index % 2 === 0 ? 'San van dong My Dinh, Ha Noi' : 'Nha thi dau Phu Tho, TP.HCM',
          startAt: new Date(now + (index + 7) * 24 * 60 * 60 * 1000),
          saleOpenAt: new Date(now - 24 * 60 * 60 * 1000),
          status: index === 0 ? 'ON_SALE' : 'PUBLISHED',
          description: `Seed concert for ${artist.name}.`,
          svgSeatingMap: '/assets/seatmaps/default-seatmap.svg',
        },
      })
    )
  );

  for (let i = 0; i < concerts.length; i += 1) {
    await prisma.concertArtist.create({
      data: { concertId: concerts[i].id, artistId: artists[i].id },
    });
    await createTicketTypes(concerts[i].id);
  }

  const firstConcert = concerts[0];
  const svipType = await prisma.ticketType.findFirstOrThrow({
    where: { concertId: firstConcert.id, name: 'SVIP' },
  });

  console.log('Creating paid sample tickets...');
  const order = await prisma.order.create({
    data: {
      userId: audience.id,
      concertId: firstConcert.id,
      status: 'paid',
      totalAmount: 10000000,
      idempotencyKey: 'seed-order-audience-svip',
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

  await prisma.ticket.createMany({
    data: [
      {
        orderItemId: orderItem.id,
        userId: audience.id,
        qrCode: 'TEST-SVIP-001',
        status: 'valid',
      },
      {
        orderItemId: orderItem.id,
        userId: audience.id,
        qrCode: 'TEST-SVIP-002',
        status: 'valid',
      },
    ],
  });

  await prisma.ticketInventory.update({
    where: { ticketTypeId: svipType.id },
    data: {
      availableQuantity: svipType.totalQuantity - 2,
      soldQuantity: 2,
    },
  });

  await prisma.ticketType.update({
    where: { id: svipType.id },
    data: { soldQuantity: 2 },
  });

  console.log('Creating admin-owned configs...');
  await prisma.staffAssignment.create({
    data: {
      staffId: staff.id,
      concertId: firstConcert.id,
      gateId: 'GATE-A',
      createdBy: organizer.id,
    },
  });

  await prisma.whitelistEmailConfig.create({
    data: {
      organizationId: organization.id,
      concertId: firstConcert.id,
      mailboxAddress: 'vip-import@ticketbox.local',
      allowedSenderEmail: 'sponsor@example.com',
      subjectKeyword: 'VIP CSV',
      status: 'ACTIVE',
    },
  });

  await prisma.vipGuest.createMany({
    data: [
      {
        concertId: firstConcert.id,
        fullName: 'VIP Guest A',
        identifier: '0901234567',
        zone: 'SVIP',
        csvBatchId: 'seed-vip-batch',
      },
      {
        concertId: firstConcert.id,
        fullName: 'VIP Guest B',
        identifier: 'guest_b@example.com',
        zone: 'VIP',
        csvBatchId: 'seed-vip-batch',
      },
    ],
  });

  console.log('Seed completed.');
  console.log('Demo login password:', PASSWORD);
  console.log('Accounts:', {
    admin: admin.email,
    organizer: organizer.email,
    staff: staff.email,
    audience: audience.email,
  });
}

main()
  .catch((error) => {
    console.error('Seed failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
