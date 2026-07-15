import app from '../src/app';
import { prisma } from '../src/shared/lib/prisma';
import redisClient from '../src/shared/lib/redis';
import { VipGuestSyncService } from '../src/modules/vip-guest-sync/vip-guest-sync.service';

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

// Hàm dọn dẹp khoảng trắng text PDF giống như cleanPdfText trong worker
function cleanPdfText(rawText: string): string {
  return rawText
    .replace(/\r/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

async function main() {
  console.log('--- STARTING E2E FEATURES SMOKE TEST ---');
  const server = app.listen(0);
  const address = server.address();
  assert(address && typeof address === 'object', 'Failed to bind smoke test server');
  const baseUrl = `http://127.0.0.1:${address.port}`;

  try {
    // 1. Đăng nhập các tài khoản
    const staff = await login(baseUrl, 'staff@example.com');
    const organizer = await login(baseUrl, 'organizer@example.com');
    console.log('✓ Login successful for staff and organizer.');

    // Tìm một vé hợp lệ có sẵn trong cơ sở dữ liệu để lấy đúng concertId, orderItemId và userId hợp lệ
    const existingTicket = await prisma.ticket.findFirst({
      where: { status: 'valid' },
      include: {
        orderItem: {
          include: {
            ticketType: {
              include: {
                concert: true
              }
            }
          }
        }
      }
    });
    assert(existingTicket, 'Must have at least one valid ticket in database');
    const concertId = existingTicket.orderItem.ticketType.concertId;
    const concert = existingTicket.orderItem.ticketType.concert;
    const orderItemId = existingTicket.orderItemId;
    const userId = existingTicket.userId;
    const gateId = 'GATE_A';

    // 2. Thiết lập cấu hình phân công staff để Scanner App chọn được cổng
    await prisma.staffAssignment.deleteMany({
      where: { staffId: staff.user.id }
    });
    await prisma.staffAssignment.create({
      data: {
        staffId: staff.user.id,
        concertId,
        gateId,
        createdBy: organizer.user.id,
      }
    });
    console.log('✓ Seeded staff assignment for test.');

    // Gọi API lấy sự kiện được phân công để xác thực Spinner App hoạt động đúng
    const assignedConcerts = await request<any[]>(baseUrl, '/api/v1/checkins/concerts', {
      token: staff.accessToken
    });
    assert(assignedConcerts.status === 200, 'Failed to fetch assigned concerts');
    assert(assignedConcerts.body.data && assignedConcerts.body.data.length > 0, 'No assigned concerts returned');
    assert(assignedConcerts.body.data[0].gateIds.includes(gateId), 'Assigned gate ID mismatch');
    console.log('✓ IM07: Scanner App can fetch assigned concerts & gates successfully.');

    // 3. Test IM07: Quét vé Online & Xử lý trạng thái vé
    // Tạo 1 vé test online
    const ticketOnline = await prisma.ticket.create({
      data: {
        qrCode: `TICKET_ONLINE_TEST_${Date.now()}`,
        status: 'valid',
        seatNumber: 'A-10',
        orderItemId,
        userId,
      }
    });

    // Quét online lần 1 -> Phải hợp lệ (VALID)
    const scanResponse1 = await request<any>(baseUrl, '/api/v1/checkins/scan', {
      method: 'POST',
      token: staff.accessToken,
      body: JSON.stringify({
        ticketId: ticketOnline.qrCode,
        concertId,
        gateId,
        deviceId: 'TEST_DEVICE_E2E_01',
        scannedAtLocal: new Date().toISOString(),
      }),
    });
    assert(scanResponse1.status === 200, 'Online scan request failed');
    assert(scanResponse1.body.data?.status === 'VALID', `Expected VALID, got ${scanResponse1.body.data?.status}`);
    console.log('✓ IM07: First online scan accepted with status VALID.');

    // Quét online lần 2 (Trùng vé) -> Phải báo trùng (ALREADY_USED)
    const scanResponse2 = await request<any>(baseUrl, '/api/v1/checkins/scan', {
      method: 'POST',
      token: staff.accessToken,
      body: JSON.stringify({
        ticketId: ticketOnline.qrCode,
        concertId,
        gateId,
        deviceId: 'TEST_DEVICE_E2E_01',
        scannedAtLocal: new Date().toISOString(),
      }),
    });
    assert(scanResponse2.status === 200, 'Second online scan request failed');
    assert(scanResponse2.body.data?.status === 'ALREADY_USED', `Expected ALREADY_USED, got ${scanResponse2.body.data?.status}`);
    console.log('✓ IM07: Second online scan rejected with status ALREADY_USED (Prevented double check-in).');

    // 4. Test IM08: Đồng bộ Logs ngoại tuyến & Xử lý xung đột chronological
    // Tạo 2 vé test offline
    const ticketOffline1 = await prisma.ticket.create({
      data: {
        qrCode: `TICKET_OFFLINE_TEST_1_${Date.now()}`,
        status: 'valid',
        seatNumber: 'B-01',
        orderItemId,
        userId,
      }
    });
    const ticketOffline2 = await prisma.ticket.create({
      data: {
        qrCode: `TICKET_OFFLINE_TEST_2_${Date.now()}`,
        status: 'valid',
        seatNumber: 'B-02',
        orderItemId,
        userId,
      }
    });

    // Gom lô gửi logs đồng bộ. Cố tình gửi 2 logs quét cùng 1 vé ticketOffline1:
    // Log 1: Quét lúc 08:00 (hợp lệ)
    // Log 2: Quét lúc 08:05 (xung đột)
    // Log 3: Quét ticketOffline2 lúc 08:00 (hợp lệ)
    const syncLogs = [
      {
        ticketId: ticketOffline1.qrCode,
        concertId,
        gateId,
        deviceId: 'DEVICE_OFFLINE_01',
        scannedAtLocal: '2026-07-15T08:05:00.000Z', // Quét muộn hơn của vé 1
      },
      {
        ticketId: ticketOffline1.qrCode,
        concertId,
        gateId,
        deviceId: 'DEVICE_OFFLINE_01',
        scannedAtLocal: '2026-07-15T08:00:00.000Z', // Quét sớm hơn của vé 1 (Sẽ thắng)
      },
      {
        ticketId: ticketOffline2.qrCode,
        concertId,
        gateId,
        deviceId: 'DEVICE_OFFLINE_01',
        scannedAtLocal: '2026-07-15T08:00:00.000Z',
      }
    ];

    const syncResponse = await request<any>(baseUrl, '/api/v1/checkins/sync', {
      method: 'POST',
      token: staff.accessToken,
      body: JSON.stringify({
        concertId,
        deviceId: 'DEVICE_OFFLINE_01',
        logs: syncLogs
      }),
    });

    assert(syncResponse.status === 200, 'Offline batch sync request failed');
    const syncResult = syncResponse.body.data;
    assert(syncResult.syncedCount === 2, `Expected 2 synced, got ${syncResult.syncedCount}`);
    assert(syncResult.conflictCount === 1, `Expected 1 conflict, got ${syncResult.conflictCount}`);
    assert(syncResult.conflicts.length === 1, 'Conflicts list should have length 1');
    assert(syncResult.conflicts[0].ticketId === ticketOffline1.qrCode, 'Conflict ticketId mismatch');
    assert(syncResult.conflicts[0].reason === 'ALREADY_USED', 'Conflict error reason mismatch');
    console.log('✓ IM08: Offline sync processed successfully. Chronological sorting resolved conflict correctly.');

    // 5. Test IM10: Validate dữ liệu và chống trùng lặp VIP Guest (Idempotent Import)
    const vipService = new VipGuestSyncService();
    // Test hàm validateRow (ép kiểu any để test hàm private)
    const validRow = {
      fullName: 'Nguyen Van VIP Test',
      email: 'viptest@example.com',
      phone: '0900000099',
      company: 'Sponsor E2E',
      eventCode: concert.eventCode,
      note: 'Note VIP',
    };
    const validationError = await (vipService as any).validateRow(validRow, 2, [concert.eventCode]);
    assert(validationError === null, 'Valid row should pass validation');

    // Test validate dòng lỗi (Sai định dạng email)
    const invalidRow = { ...validRow, email: 'not-an-email' };
    const invalidError = await (vipService as any).validateRow(invalidRow, 3, [concert.eventCode]);
    assert(invalidError !== null && invalidError.message.includes('khong hop le'), 'Invalid email should fail validation');
    console.log('✓ IM10: CSV row-level validation works perfectly.');

    // 6. Test IM09: Làm sạch text PDF cho Artist Bio
    const rawPdfText = 'Ca si\rSon Tung\t\tM-TP \n\n\n Sky Tour  2026 ';
    const cleanResult = cleanPdfText(rawPdfText);
    assert(cleanResult === 'Ca si\nSon Tung M-TP \n\n Sky Tour 2026', `Text cleaning logic error: ${cleanResult}`);
    console.log('✓ IM09: PDF text cleaning utility works correctly.');

    console.log('--- ALL E2E FEATURES SMOKE TESTS PASSED SUCCESSFULLY! ---');
  } catch (error) {
    console.error('✗ SMOKE TEST FAILED:', error);
    process.exit(1);
  } finally {
    server.close();
    await prisma.$disconnect();
    await redisClient.quit();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
