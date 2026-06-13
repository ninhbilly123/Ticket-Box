import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Cleaning up existing database records...');
  await prisma.ticket.deleteMany();
  await prisma.order.deleteMany();
  await prisma.ticketType.deleteMany();
  await prisma.concert.deleteMany();

  console.log('Creating seed concert data...');
  const concert = await prisma.concert.create({
    data: {
      title: 'Sky Tour 2026',
      description: 'Concert tour diễn xuyên Việt hoành tráng nhất năm 2026 của Sơn Tùng M-TP.',
      artist: 'Sơn Tùng M-TP',
      dateTime: new Date('2026-12-15T19:00:00Z'),
      location: 'Sân vận động Mỹ Đình, Hà Nội',
      seatMapUrl: '/assets/seatmaps/skytour-seatmap.svg',
    },
  });

  console.log(`Created Concert: ${concert.title} (ID: ${concert.id})`);

  console.log('Creating ticket types for concert...');
  const ticketTypes = [
    {
      name: 'SVIP',
      price: 5000000,
      totalQuantity: 100,
      maxLimitPerUser: 2,
    },
    {
      name: 'VIP',
      price: 3000000,
      totalQuantity: 300,
      maxLimitPerUser: 4,
    },
    {
      name: 'CAT1',
      price: 2000000,
      totalQuantity: 500,
      maxLimitPerUser: 4,
    },
    {
      name: 'CAT2',
      price: 1500000,
      totalQuantity: 600,
      maxLimitPerUser: 4,
    },
    {
      name: 'GA',
      price: 8000000, // General Admission
      totalQuantity: 1000,
      maxLimitPerUser: 6,
    },
  ];

  for (const tt of ticketTypes) {
    await prisma.ticketType.create({
      data: {
        concertId: concert.id,
        name: tt.name,
        price: tt.price,
        totalQuantity: tt.totalQuantity,
        maxLimitPerUser: tt.maxLimitPerUser,
      },
    });
  }

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
