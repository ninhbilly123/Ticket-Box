import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const sampleConcerts = [
  {
    eventCode: 'ATSH-2026-HCM',
    title: 'Anh Trai Say Hi 2026',
    description: 'Dem nhac Anh Trai Say Hi tai TP.HCM.',
    artist: 'Anh Trai Say Hi',
    dateTime: new Date('2026-12-15T19:00:00Z'),
    location: 'San van dong Quan khu 7, TP.HCM',
    seatMapUrl: '/assets/seatmaps/atsh-zone-map.svg',
    ticketTypes: [
      { name: 'SVIP', price: 5000000, totalQuantity: 100, maxLimitPerUser: 2 },
      { name: 'VIP', price: 3000000, totalQuantity: 300, maxLimitPerUser: 4 },
      { name: 'CAT1', price: 2000000, totalQuantity: 500, maxLimitPerUser: 4 },
      { name: 'CAT2', price: 1500000, totalQuantity: 600, maxLimitPerUser: 4 },
      { name: 'GA', price: 800000, totalQuantity: 1000, maxLimitPerUser: 6 },
    ],
  },
  {
    eventCode: 'ATVNCG-2026-HN',
    title: 'Anh Trai Vuot Ngan Chong Gai 2026',
    description: 'Concert Anh Trai Vuot Ngan Chong Gai tai Ha Noi.',
    artist: 'Anh Trai Vuot Ngan Chong Gai',
    dateTime: new Date('2026-12-22T19:00:00Z'),
    location: 'San van dong My Dinh, Ha Noi',
    seatMapUrl: '/assets/seatmaps/atvncg-zone-map.svg',
    ticketTypes: [
      { name: 'SVIP', price: 4800000, totalQuantity: 120, maxLimitPerUser: 2 },
      { name: 'VIP', price: 2800000, totalQuantity: 350, maxLimitPerUser: 4 },
      { name: 'CAT1', price: 1900000, totalQuantity: 520, maxLimitPerUser: 4 },
      { name: 'CAT2', price: 1300000, totalQuantity: 700, maxLimitPerUser: 4 },
      { name: 'GA', price: 700000, totalQuantity: 1200, maxLimitPerUser: 6 },
    ],
  },
  {
    eventCode: 'EXSH-2026-HCM',
    title: 'Em Xinh Say Hi 2026',
    description: 'Concert Em Xinh Say Hi tai TP.HCM.',
    artist: 'Em Xinh Say Hi',
    dateTime: new Date('2027-01-05T19:00:00Z'),
    location: 'Nha thi dau Phu Tho, TP.HCM',
    seatMapUrl: '/assets/seatmaps/exsh-zone-map.svg',
    ticketTypes: [
      { name: 'SVIP', price: 4500000, totalQuantity: 100, maxLimitPerUser: 2 },
      { name: 'VIP', price: 2600000, totalQuantity: 300, maxLimitPerUser: 4 },
      { name: 'CAT1', price: 1800000, totalQuantity: 500, maxLimitPerUser: 4 },
      { name: 'CAT2', price: 1200000, totalQuantity: 650, maxLimitPerUser: 4 },
      { name: 'GA', price: 650000, totalQuantity: 1100, maxLimitPerUser: 6 },
    ],
  },
  {
    eventCode: 'CDDG-2026-DN',
    title: 'Chi Dep Dap Gio Re Song 2026',
    description: 'Concert Chi Dep Dap Gio Re Song tai Da Nang.',
    artist: 'Chi Dep Dap Gio Re Song',
    dateTime: new Date('2027-01-12T19:00:00Z'),
    location: 'Cung the thao Tien Son, Da Nang',
    seatMapUrl: '/assets/seatmaps/cddg-zone-map.svg',
    ticketTypes: [
      { name: 'SVIP', price: 4200000, totalQuantity: 90, maxLimitPerUser: 2 },
      { name: 'VIP', price: 2400000, totalQuantity: 280, maxLimitPerUser: 4 },
      { name: 'CAT1', price: 1600000, totalQuantity: 450, maxLimitPerUser: 4 },
      { name: 'CAT2', price: 1000000, totalQuantity: 600, maxLimitPerUser: 4 },
      { name: 'GA', price: 550000, totalQuantity: 900, maxLimitPerUser: 6 },
    ],
  },
];

async function main() {
  console.log('Cleaning up existing database records...');
  await prisma.guestImportRowError.deleteMany();
  await prisma.vipGuest.deleteMany();
  await prisma.guestImportJob.deleteMany();
  await prisma.sponsorEmail.deleteMany();
  await prisma.artistBio.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.ticket.deleteMany();
  await prisma.order.deleteMany();
  await prisma.ticketType.deleteMany();
  await prisma.concert.deleteMany();

  console.log('Creating seed concert data...');
  for (const concertInput of sampleConcerts) {
    const { ticketTypes, ...concertData } = concertInput;
    const concert = await prisma.concert.create({ data: concertData });

    for (const ticketType of ticketTypes) {
      await prisma.ticketType.create({
        data: {
          concertId: concert.id,
          name: ticketType.name,
          price: ticketType.price,
          totalQuantity: ticketType.totalQuantity,
          maxLimitPerUser: ticketType.maxLimitPerUser,
        },
      });
    }

    console.log(`Created concert ${concert.eventCode}: ${concert.title}`);
  }

  await prisma.sponsorEmail.create({
    data: {
      email: 'sponsor@example.com',
      displayName: 'Demo Sponsor',
      allowedEventCodes: sampleConcerts.map((concert) => concert.eventCode),
    },
  });

  console.log('Seeding process completed successfully!');
}

main()
  .catch((error) => {
    console.error('Error during seeding:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
