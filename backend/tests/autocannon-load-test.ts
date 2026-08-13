import 'reflect-metadata';
import { performance } from 'perf_hooks';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { prisma } from '../src/shared/lib/prisma';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

async function runConcurrentRequests(params: {
  amount: number;
  concurrency: number;
  task: (index: number) => Promise<number>;
}) {
  const latencies: number[] = [];
  let sent = 0;
  let non2xx = 0;
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < params.amount) {
      const currentIndex = nextIndex++;
      const startedAt = performance.now();
      const status = await params.task(currentIndex);
      latencies.push(performance.now() - startedAt);
      sent++;
      if (status < 200 || status >= 300) {
        non2xx++;
      }
    }
  }

  await Promise.all(Array.from({ length: params.concurrency }, () => worker()));
  const latencyAverage = latencies.length
    ? latencies.reduce((sum, value) => sum + value, 0) / latencies.length
    : 0;

  return { sent, non2xx, latencyAverage };
}

async function main() {
  console.log('=== Starting HTTP concurrency load test ===');

  process.env.HOLD_ORDER_USER_RATE_LIMIT = '1000';
  process.env.HOLD_ORDER_IP_RATE_LIMIT = '1000';

  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    console.error('JWT_SECRET is required to sign test tokens.');
    process.exit(1);
  }

  console.log('1. Creating test concert and inventory...');
  const org = await prisma.organization.create({
    data: { name: `Test Org Load ${Date.now()}` },
  });

  const organizer = await prisma.user.create({
    data: {
      email: `organizer-load-${Date.now()}@example.com`,
      passwordHash: 'dummy',
      fullName: 'Organizer Load',
      role: 'ORGANIZER',
      organizationId: org.id,
      status: 'ACTIVE',
    },
  });

  const concert = await prisma.concert.create({
    data: {
      eventCode: `CONC-LOAD-${Date.now()}`,
      organizerId: organizer.id,
      organizationId: org.id,
      name: 'HTTP Load Test Concert',
      venue: 'HTTP Load Arena',
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
      maxPerAccount: 50,
    },
  });

  await prisma.ticketInventory.create({
    data: {
      ticketTypeId: ticketType.id,
      totalQuantity: 100,
      availableQuantity: 100,
      reservedQuantity: 0,
      soldQuantity: 0,
    },
  });

  console.log('2. Creating 10 audience users and JWT tokens...');
  const tokens: string[] = [];
  const users = [];

  for (let i = 0; i < 10; i++) {
    const user = await prisma.user.create({
      data: {
        email: `aud-load-${i}-${Date.now()}@example.com`,
        passwordHash: 'dummy',
        fullName: `Audience Load ${i}`,
        role: 'AUDIENCE',
        status: 'ACTIVE',
      },
    });
    users.push(user);

    tokens.push(jwt.sign(
      {
        sub: user.id,
        email: user.email,
        role: 'AUDIENCE',
        organizationId: null,
      },
      jwtSecret,
      { expiresIn: '1h' },
    ));
  }

  let nestApp: any;
  try {
    console.log('3. Starting API server on a random port...');
    nestApp = await NestFactory.create(AppModule, { logger: false });
    await nestApp.listen(0);
    const address = nestApp.getHttpServer().address();
    if (!address || typeof address !== 'object') {
      throw new Error('Failed to bind server port');
    }

    const baseUrl = `http://127.0.0.1:${address.port}`;
    console.log(`- Server listening at: ${baseUrl}`);
    console.log('4. Running 200 hold-order requests with 10 workers...');

    const result = await runConcurrentRequests({
      amount: 200,
      concurrency: 10,
      task: async (index) => {
        const response = await fetch(`${baseUrl}/api/v1/orders/hold`, {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            authorization: `Bearer ${tokens[index % tokens.length]}`,
            'idempotency-key': `idem-load-${crypto.randomUUID()}`,
          },
          body: JSON.stringify({
            concertId: concert.id,
            items: [{ ticketTypeId: ticketType.id, quantity: 1 }],
          }),
        });
        await response.arrayBuffer();
        return response.status;
      },
    });

    console.log('\n=== LOAD TEST RESULT ===');
    console.log(`- Requests completed: ${result.sent}`);
    console.log(`- Average latency: ${result.latencyAverage.toFixed(2)} ms`);
    console.log(`- Non-2xx responses: ${result.non2xx}`);
    console.log(`- 2xx responses: ${result.sent - result.non2xx}`);

    const finalInventory = await prisma.ticketInventory.findUnique({
      where: { ticketTypeId: ticketType.id },
    });

    console.log('\n=== INVENTORY AFTER LOAD ===');
    console.log(`- Available quantity: ${finalInventory?.availableQuantity}`);
    console.log(`- Reserved quantity: ${finalInventory?.reservedQuantity}`);

    if (finalInventory?.availableQuantity === 0 && finalInventory?.reservedQuantity === 100) {
      console.log('\nPASS: PostgreSQL locking held inventory at exactly 100 successful holds.');
    } else {
      console.log('\nFAIL: Inventory state indicates oversell or reservation drift.');
    }
  } catch (error) {
    console.error('Load test failed:', error);
  } finally {
    console.log('\n5. Cleaning test data...');
    if (nestApp) {
      await nestApp.close();
    }

    const orderIds = await prisma.order.findMany({
      where: { concertId: concert.id },
      select: { id: true },
    });
    const ids = orderIds.map((order) => order.id);

    if (ids.length > 0) {
      await prisma.ticket.deleteMany({ where: { orderItem: { orderId: { in: ids } } } });
      await prisma.orderItem.deleteMany({ where: { orderId: { in: ids } } });
      await prisma.order.deleteMany({ where: { id: { in: ids } } });
    }

    await prisma.ticketInventory.delete({ where: { ticketTypeId: ticketType.id } });
    await prisma.ticketType.delete({ where: { id: ticketType.id } });
    await prisma.concert.delete({ where: { id: concert.id } });
    await prisma.user.deleteMany({ where: { id: { in: [...users.map((user) => user.id), organizer.id] } } });
    await prisma.organization.delete({ where: { id: org.id } });
    await prisma.$disconnect();

    console.log('=== Cleanup completed ===');
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
