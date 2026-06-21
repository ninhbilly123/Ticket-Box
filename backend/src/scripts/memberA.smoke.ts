import app from '../app';
import { prisma } from '../shared/lib/prisma';
import redisClient from '../shared/lib/redis';

interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: { code: string; message: string };
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

async function request<T>(
  baseUrl: string,
  path: string,
  options: RequestInit & { token?: string } = {}
): Promise<{ status: number; body: ApiResponse<T> }> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> | undefined),
  };
  if (options.token) {
    headers.Authorization = `Bearer ${options.token}`;
  }

  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers,
  });
  const body = (await response.json()) as ApiResponse<T>;
  return { status: response.status, body };
}

async function login(baseUrl: string, email: string) {
  const result = await request<{
    accessToken: string;
    refreshToken: string;
    user: { id: string; role: string; organizationId: string | null };
  }>(baseUrl, '/api/v1/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password: 'Password123!' }),
  });

  assert(result.status === 200, `Login failed for ${email}: ${JSON.stringify(result.body)}`);
  assert(result.body.data?.accessToken, `Missing access token for ${email}`);
  return result.body.data;
}

async function main() {
  const server = app.listen(0);
  const address = server.address();
  assert(address && typeof address === 'object', 'Failed to bind smoke test server');
  const baseUrl = `http://127.0.0.1:${address.port}`;

  try {
    const organizer = await login(baseUrl, 'organizer@example.com');
    const audience = await login(baseUrl, 'audience@example.com');

    const invalidLogin = await request(baseUrl, '/api/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'audience@example.com', password: 'wrong-password' }),
    });
    assert(invalidLogin.status === 401, 'Invalid login should return 401');
    assert(invalidLogin.body.error?.code === 'AUTH_INVALID_CREDENTIALS', 'Invalid login code mismatch');

    const me = await request(baseUrl, '/api/v1/auth/me', { token: organizer.accessToken });
    assert(me.status === 200, '/auth/me should return current organizer');

    const audienceAdmin = await request(baseUrl, '/api/v1/admin/concerts', { token: audience.accessToken });
    assert(audienceAdmin.status === 403, 'AUDIENCE must not access admin concerts');
    assert(audienceAdmin.body.error?.code === 'FORBIDDEN_ROLE', 'AUDIENCE forbidden code mismatch');

    const organizerConcerts = await request<Array<{ id: string; ticketTypes: Array<{ id: string; soldQuantity: number }> }>>(
      baseUrl,
      '/api/v1/admin/concerts',
      { token: organizer.accessToken }
    );
    assert(organizerConcerts.status === 200, 'Organizer should list own concerts');
    assert((organizerConcerts.body.data?.length || 0) > 0, 'Organizer should have seeded concerts');

    const firstConcert = organizerConcerts.body.data![0];
    const firstTicketType = firstConcert.ticketTypes.find((ticketType) => ticketType.soldQuantity > 0) || firstConcert.ticketTypes[0];
    assert(firstTicketType?.id, 'Seeded concert should have ticket types');

    const badInventory = await request(baseUrl, `/api/v1/admin/ticket-types/${firstTicketType.id}/inventory`, {
      method: 'PATCH',
      token: organizer.accessToken,
      body: JSON.stringify({ totalQuantity: 1 }),
    });
    assert(badInventory.status === 400, 'Invalid inventory update should fail');
    assert(badInventory.body.error?.code === 'TICKET_QUANTITY_INVALID', 'Inventory error code mismatch');

    const revenue = await request(baseUrl, `/api/v1/admin/concerts/${firstConcert.id}/revenue-summary`, {
      token: organizer.accessToken,
    });
    assert(revenue.status === 200, 'Organizer should view own revenue summary');

    const staffUsers = await request<Array<{ id: string; role: string }>>(baseUrl, '/api/v1/admin/staff', {
      token: organizer.accessToken,
    });
    assert(staffUsers.status === 200, 'Organizer should list check-in staff in own organization');
    assert(
      staffUsers.body.data?.every((user) => user.role === 'CHECKIN_STAFF'),
      'Staff list should only include check-in staff'
    );

    const newStaffEmail = `smoke-staff-${Date.now()}@example.com`;
    const createdStaff = await request<{ id: string; email: string; role: string }>(baseUrl, '/api/v1/admin/staff', {
      method: 'POST',
      token: organizer.accessToken,
      body: JSON.stringify({
        email: newStaffEmail,
        password: 'Password123!',
        fullName: 'Smoke Check-in Staff',
        phone: '0909090909',
      }),
    });
    assert(createdStaff.status === 201, 'Organizer should create check-in staff');
    assert(createdStaff.body.data?.role === 'CHECKIN_STAFF', 'Created staff should have CHECKIN_STAFF role');

    const createdAssignment = await request<{ id: string }>(
      baseUrl,
      `/api/v1/admin/concerts/${firstConcert.id}/staff-assignments`,
      {
        method: 'POST',
        token: organizer.accessToken,
        body: JSON.stringify({ staffId: createdStaff.body.data!.id, gateId: 'GATE-SMOKE' }),
      }
    );
    assert(createdAssignment.status === 201, 'Organizer should assign newly created staff');
    await prisma.staffAssignment.delete({ where: { id: createdAssignment.body.data!.id } });
    await prisma.user.delete({ where: { id: createdStaff.body.data!.id } });

    const activeWhitelist = await request(baseUrl, '/api/v1/internal/whitelist-email-configs/active');
    assert(activeWhitelist.status === 200, 'Internal active whitelist API should work');

    const orgB = await prisma.organization.create({ data: { name: 'Other Organizer' } });
    const organizerB = await prisma.user.create({
      data: {
        email: `other-organizer-${Date.now()}@example.com`,
        passwordHash: 'not-used-in-smoke',
        fullName: 'Other Organizer',
        role: 'ORGANIZER',
        organizationId: orgB.id,
        status: 'ACTIVE',
      },
    });
    const foreignConcert = await prisma.concert.create({
      data: {
        eventCode: `SMOKE-${Date.now()}`,
        organizerId: organizerB.id,
        organizationId: orgB.id,
        name: 'Foreign Concert',
        venue: 'Other Venue',
        startAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        saleOpenAt: new Date(),
        status: 'DRAFT',
      },
    });

    const forbiddenObject = await request(baseUrl, `/api/v1/admin/concerts/${foreignConcert.id}`, {
      token: organizer.accessToken,
    });
    assert(forbiddenObject.status === 403, 'Organizer must not access another organization concert');
    assert(forbiddenObject.body.error?.code === 'FORBIDDEN_RESOURCE', 'Object auth error code mismatch');
    await prisma.concert.delete({ where: { id: foreignConcert.id } });
    await prisma.user.delete({ where: { id: organizerB.id } });
    await prisma.organization.delete({ where: { id: orgB.id } });

    const refreshed = await request(baseUrl, '/api/v1/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refreshToken: organizer.refreshToken }),
    });
    assert(refreshed.status === 200, 'Refresh token should rotate successfully');

    const logout = await request(baseUrl, '/api/v1/auth/logout', {
      method: 'POST',
      body: JSON.stringify({ refreshToken: audience.refreshToken }),
    });
    assert(logout.status === 200, 'Logout should succeed');

    console.log('Member A smoke test passed.');
  } finally {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
    await prisma.$disconnect();
    if (redisClient.isOpen) {
      await redisClient.quit();
    }
  }
}

main().catch((error) => {
  console.error('Member A smoke test failed:', error);
  process.exit(1);
});
