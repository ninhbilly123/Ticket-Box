import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const PASSWORD = 'Password123!';
const STAFF_ID = '7abe2001-f718-462d-b76a-18507d442df7';
const AUDIENCE_ID = '11111111-1111-4111-8111-111111111111';

const ticketCatalog = [
  { name: 'SVIP', price: 4000000, totalQuantity: 100, maxPerAccount: 2 },
  { name: 'VIP', price: 2500000, totalQuantity: 250, maxPerAccount: 4 },
  { name: 'CAT1', price: 1500000, totalQuantity: 400, maxPerAccount: 4 },
  { name: 'CAT2', price: 1000000, totalQuantity: 500, maxPerAccount: 4 },
  { name: 'GA', price: 600000, totalQuantity: 800, maxPerAccount: 6 },
];

async function resetDatabase() {
  await prisma.auditLog.deleteMany();
  await prisma.guestImportRowError.deleteMany();
  await prisma.whitelistEmailConfig.deleteMany();
  await prisma.staffAssignment.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.checkinLog.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.vipGuest.deleteMany();
  await prisma.guestImportJob.deleteMany();
  await prisma.sponsorEmail.deleteMany();
  await prisma.artistBio.deleteMany();
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
  const ticketTypes: Record<string, string> = {};

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

    ticketTypes[item.name] = ticketType.id;
  }

  return ticketTypes;
}

async function updateInventory(ticketTypeId: string, soldDelta: number, reservedDelta: number) {
  const ticketType = await prisma.ticketType.findUniqueOrThrow({
    where: { id: ticketTypeId },
    include: { inventory: true },
  });

  const soldQuantity = ticketType.soldQuantity + soldDelta;
  const reservedQuantity = ticketType.reservedQuantity + reservedDelta;
  const availableQuantity = ticketType.totalQuantity - soldQuantity - reservedQuantity;

  await prisma.ticketType.update({
    where: { id: ticketTypeId },
    data: { soldQuantity, reservedQuantity },
  });

  await prisma.ticketInventory.upsert({
    where: { ticketTypeId },
    create: {
      ticketTypeId,
      totalQuantity: ticketType.totalQuantity,
      availableQuantity,
      soldQuantity,
      reservedQuantity,
    },
    update: {
      totalQuantity: ticketType.totalQuantity,
      availableQuantity,
      soldQuantity,
      reservedQuantity,
    },
  });
}

async function createOrderWithTickets(input: {
  userId: string;
  concertId: string;
  status: 'paid' | 'pending' | 'failed';
  totalAmount: number;
  idempotencyKey: string;
  paymentGateway: 'MOMO' | 'VNPAY';
  paymentStatus: 'SUCCESS' | 'PENDING' | 'FAILED';
  transactionId?: string;
  responseCode?: string;
  items?: Array<{
    ticketTypeId: string;
    quantity: number;
    unitPrice: number;
    tickets: Array<{ qrCode: string; status: 'valid' | 'used'; seatNumber?: string; usedAt?: Date }>;
  }>;
}) {
  const order = await prisma.order.create({
    data: {
      userId: input.userId,
      concertId: input.concertId,
      status: input.status,
      totalAmount: input.totalAmount,
      idempotencyKey: input.idempotencyKey,
      paidAt: input.status === 'paid' ? new Date() : null,
    },
  });

  for (const item of input.items || []) {
    const orderItem = await prisma.orderItem.create({
      data: {
        orderId: order.id,
        ticketTypeId: item.ticketTypeId,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
      },
    });

    for (const ticket of item.tickets) {
      await prisma.ticket.create({
        data: {
          orderItemId: orderItem.id,
          userId: input.userId,
          qrCode: ticket.qrCode,
          status: ticket.status,
          seatNumber: ticket.seatNumber,
          usedAt: ticket.usedAt,
        },
      });
    }

    await updateInventory(
      item.ticketTypeId,
      input.status === 'paid' ? item.quantity : 0,
      input.status === 'pending' ? item.quantity : 0
    );
  }

  await prisma.payment.create({
    data: {
      orderId: order.id,
      paymentGateway: input.paymentGateway,
      amount: input.totalAmount,
      status: input.paymentStatus,
      transactionId: input.transactionId,
      responseCode: input.responseCode,
    },
  });

  return order;
}

async function main() {
  console.log('Cleaning database...');
  await resetDatabase();

  const passwordHash = await bcrypt.hash(PASSWORD, 10);

  console.log('Creating organizations and users...');
  const demoOrg = await prisma.organization.create({ data: { name: 'Demo Organizer' } });

  const organizer = await prisma.user.create({
    data: {
      email: 'organizer@example.com',
      passwordHash,
      fullName: 'Demo Organizer Manager',
      phone: '0987654321',
      role: 'ORGANIZER',
      organizationId: demoOrg.id,
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
      organizationId: demoOrg.id,
      status: 'ACTIVE',
    },
  });

  const staff2 = await prisma.user.create({
    data: {
      email: 'staff2@example.com',
      passwordHash,
      fullName: 'Gate B Check-in Staff',
      phone: '0912112233',
      role: 'CHECKIN_STAFF',
      organizationId: demoOrg.id,
      status: 'ACTIVE',
    },
  });

  const audience = await prisma.user.create({
    data: {
      id: AUDIENCE_ID,
      email: 'audience@example.com',
      passwordHash,
      fullName: 'Demo Audience',
      phone: '0900000000',
      role: 'AUDIENCE',
      status: 'ACTIVE',
    },
  });

  const customers = await Promise.all(
    [
      ['customer1@example.com', 'Nguyen Duc Anh', '0933445500'],
      ['customer2@example.com', 'Tran Thanh Binh', '0933445511'],
      ['customer3@example.com', 'Le My Chi', '0933445522'],
      ['customer4@example.com', 'Pham Tuan Dung', '0933445533'],
    ].map(([email, fullName, phone]) =>
      prisma.user.create({
        data: {
          email,
          passwordHash,
          fullName,
          phone,
          role: 'AUDIENCE',
          status: 'ACTIVE',
        },
      })
    )
  );

  console.log('Creating artists and concerts...');
  const artists = await Promise.all(
    [
      ['Son Tung M-TP', 'Seeded artist profile for Sky Tour.', '/assets/presskits/sontung-mtp.pdf'],
      ['Den Vau', 'Seeded artist profile for Den Vau live show.', '/assets/presskits/denvau.pdf'],
      ['My Tam', 'Seeded artist profile for Tri Am live.', '/assets/presskits/mytam.pdf'],
      ['Hoang Thuy Linh', 'Seeded artist profile for Vietnamese concert.', '/assets/presskits/hoangthuylinh.pdf'],
    ].map(([name, bioGenerated, pdfSourceUrl]) =>
      prisma.artist.create({
        data: { name, bioGenerated, pdfSourceUrl },
      })
    )
  );

  const now = new Date();
  const concertSeeds = [
    {
      eventCode: 'SKYTOUR-2026-HN',
      name: 'Sky Tour 2026',
      venue: 'San van dong My Dinh, Ha Noi',
      startAt: new Date(now.getTime() + 2 * 60 * 60 * 1000),
      organizerId: organizer.id,
      organizationId: demoOrg.id,
      artistId: artists[0].id,
      map: '/assets/seatmaps/skytour-seatmap.svg',
    },
    {
      eventCode: 'DENV-2026-HCM',
      name: 'Show cua Den 2026',
      venue: 'Nha thi dau Phu Tho, TP HCM',
      startAt: new Date(now.getTime() + 12 * 24 * 60 * 60 * 1000),
      organizerId: organizer.id,
      organizationId: demoOrg.id,
      artistId: artists[1].id,
      map: '/assets/seatmaps/denvau-seatmap.svg',
    },
    {
      eventCode: 'MYTAM-2026-HCM',
      name: 'My Tam - Tri Am Live 2026',
      venue: 'San van dong Quan khu 7, TP HCM',
      startAt: new Date(now.getTime() + 25 * 24 * 60 * 60 * 1000),
      organizerId: organizer.id,
      organizationId: demoOrg.id,
      artistId: artists[2].id,
      map: '/assets/seatmaps/mytam-seatmap.svg',
    },
    {
      eventCode: 'MTP-2026-HN',
      name: 'MTP Special Night',
      venue: 'Trung tam Hoi nghi Quoc gia, Ha Noi',
      startAt: new Date(now.getTime() + 18 * 24 * 60 * 60 * 1000),
      organizerId: organizer.id,
      organizationId: demoOrg.id,
      artistId: artists[0].id,
      map: '/assets/seatmaps/mtp-special-seatmap.svg',
    },
  ];

  const concerts = [];
  const ticketTypesByConcert: Record<string, Record<string, string>> = {};

  for (const item of concertSeeds) {
    const concert = await prisma.concert.create({
      data: {
        organizerId: item.organizerId,
        organizationId: item.organizationId,
        eventCode: item.eventCode,
        name: item.name,
        venue: item.venue,
        startAt: item.startAt,
        saleOpenAt: new Date(item.startAt.getTime() - 15 * 24 * 60 * 60 * 1000),
        status: 'PUBLISHED',
        description: `Seed concert for ${item.name}.`,
        svgSeatingMap: item.map,
      },
    });

    await prisma.concertArtist.create({
      data: { concertId: concert.id, artistId: item.artistId },
    });

    ticketTypesByConcert[concert.id] = await createTicketTypes(concert.id);
    concerts.push(concert);
  }

  const firstConcert = concerts[0];
  const firstTicketTypes = ticketTypesByConcert[firstConcert.id];
  const secondConcert = concerts[1];
  const secondTicketTypes = ticketTypesByConcert[secondConcert.id];

  console.log('Creating staff assignments...');
  await prisma.staffAssignment.create({
    data: {
      staffId: staff.id,
      concertId: firstConcert.id,
      gateId: 'GATE-A',
      createdBy: organizer.id,
    },
  });
  await prisma.staffAssignment.create({
    data: {
      staffId: staff2.id,
      concertId: firstConcert.id,
      gateId: 'GATE-B',
      createdBy: organizer.id,
    },
  });

  console.log('Creating orders, tickets, check-in logs, and payments...');
  await createOrderWithTickets({
    userId: audience.id,
    concertId: firstConcert.id,
    status: 'paid',
    totalAmount: 8000000,
    idempotencyKey: 'seed_order_skytour_audience_svip',
    paymentGateway: 'MOMO',
    paymentStatus: 'SUCCESS',
    transactionId: 'MOMO_TX_000001',
    responseCode: '0',
    items: [
      {
        ticketTypeId: firstTicketTypes.SVIP,
        quantity: 2,
        unitPrice: 4000000,
        tickets: [
          { qrCode: 'TICKET-SKYT-SVIP-001', status: 'valid', seatNumber: 'SVIP-A01' },
          {
            qrCode: 'TICKET-SKYT-SVIP-002',
            status: 'used',
            seatNumber: 'SVIP-A02',
            usedAt: new Date(now.getTime() - 60 * 60 * 1000),
          },
        ],
      },
    ],
  });

  const usedTicket = await prisma.ticket.findUniqueOrThrow({
    where: { qrCode: 'TICKET-SKYT-SVIP-002' },
  });
  await prisma.checkinLog.create({
    data: {
      ticketId: usedTicket.id,
      gateStaffId: staff.id,
      deviceId: 'GATE-DEVICE-01',
      synced: true,
      scannedAtLocal: new Date(now.getTime() - 60 * 60 * 1000),
      syncedAt: new Date(),
    },
  });

  await createOrderWithTickets({
    userId: customers[0].id,
    concertId: secondConcert.id,
    status: 'paid',
    totalAmount: 3700000,
    idempotencyKey: 'seed_order_denvau_customer1',
    paymentGateway: 'VNPAY',
    paymentStatus: 'SUCCESS',
    transactionId: 'VNPAY_TX_000002',
    responseCode: '00',
    items: [
      {
        ticketTypeId: secondTicketTypes.VIP,
        quantity: 1,
        unitPrice: 2500000,
        tickets: [{ qrCode: 'TICKET-DENV-VIP-101', status: 'valid', seatNumber: 'VIP-B01' }],
      },
      {
        ticketTypeId: secondTicketTypes.GA,
        quantity: 2,
        unitPrice: 600000,
        tickets: [
          { qrCode: 'TICKET-DENV-GA-102', status: 'valid', seatNumber: 'GA-E102' },
          { qrCode: 'TICKET-DENV-GA-103', status: 'valid', seatNumber: 'GA-E103' },
        ],
      },
    ],
  });

  await createOrderWithTickets({
    userId: customers[1].id,
    concertId: firstConcert.id,
    status: 'pending',
    totalAmount: 600000,
    idempotencyKey: 'seed_order_skytour_pending_ga',
    paymentGateway: 'MOMO',
    paymentStatus: 'PENDING',
    items: [
      {
        ticketTypeId: firstTicketTypes.GA,
        quantity: 1,
        unitPrice: 600000,
        tickets: [{ qrCode: 'TICKET-SKYT-GA-PENDING-001', status: 'valid', seatNumber: 'GA-F401' }],
      },
    ],
  });

  await createOrderWithTickets({
    userId: customers[2].id,
    concertId: firstConcert.id,
    status: 'failed',
    totalAmount: 4000000,
    idempotencyKey: 'seed_order_skytour_failed',
    paymentGateway: 'VNPAY',
    paymentStatus: 'FAILED',
    transactionId: 'VNPAY_TX_FAILED_01',
    responseCode: '99',
  });

  console.log('Creating whitelist email config and VIP guests...');
  await prisma.whitelistEmailConfig.create({
    data: {
      organizationId: demoOrg.id,
      concertId: firstConcert.id,
      mailboxAddress: 'vip-import@ticketbox.local',
      allowedSenderEmail: 'sponsor@example.com',
      subjectKeyword: 'VIP CSV',
      status: 'ACTIVE',
    },
  });

  await prisma.sponsorEmail.create({
    data: {
      email: 'sponsor@example.com',
      displayName: 'Demo Sponsor',
      allowedEventCodes: concertSeeds.map((concert) => concert.eventCode),
    },
  });

  await prisma.vipGuest.createMany({
    data: [
      {
        concertId: firstConcert.id,
        fullName: 'VIP Guest A',
        identifier: 'vip.a@example.com',
        zone: 'SVIP',
        csvBatchId: 'batch_seed_01',
      },
      {
        concertId: firstConcert.id,
        fullName: 'VIP Guest B',
        identifier: '0901234567',
        zone: 'VIP',
        csvBatchId: 'batch_seed_01',
      },
      {
        concertId: secondConcert.id,
        fullName: 'VIP Guest C',
        identifier: 'vip.c@example.com',
        zone: 'CAT1',
        csvBatchId: 'batch_seed_02',
      },
    ],
  });

  await prisma.notification.create({
    data: {
      userId: audience.id,
      concertId: firstConcert.id,
      channel: 'email',
      type: 'purchase_confirm',
      status: 'sent',
      sentAt: new Date(),
    },
  });

  console.log('Seed completed.');
  console.log('Demo login password:', PASSWORD);
  console.table({
    organizer: organizer.email,
    staff: staff.email,
    audience: audience.email,
  });
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
