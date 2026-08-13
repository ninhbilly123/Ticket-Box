import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { prisma } from '../src/shared/lib/prisma';
import jwt from 'jsonwebtoken';
import http from 'http';

async function requestJson(url: string, options: http.RequestOptions, body?: any): Promise<{ status: number; data: any }> {
  return new Promise((resolve, reject) => {
    const req = http.request(url, options, (res) => {
      let responseBody = '';
      res.on('data', (chunk) => { responseBody += chunk; });
      res.on('end', () => {
        try {
          resolve({
            status: res.statusCode || 0,
            data: responseBody ? JSON.parse(responseBody) : {},
          });
        } catch {
          resolve({ status: res.statusCode || 0, data: responseBody });
        }
      });
    });
    req.on('error', reject);
    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

async function main() {
  console.log('=== Khởi chạy Rate Limiting Test (IM12) ===');

  // Cấu hình môi trường Rate Limit thấp để phục vụ test vượt ngưỡng
  process.env.HOLD_ORDER_USER_RATE_LIMIT = '2';
  process.env.HOLD_ORDER_IP_RATE_LIMIT = '2';
  process.env.HOLD_ORDER_RATE_LIMIT_WINDOW_SECONDS = '10';

  const jwtSecret = process.env.JWT_SECRET || 'test-secret';

  // 1. Tạo user giả lập để ký token
  console.log('1. Khởi tạo User giả lập...');
  const user = await prisma.user.create({
    data: {
      email: `aud-rl-${Date.now()}@example.com`,
      passwordHash: 'dummy',
      fullName: 'Rate Limit Audience',
      role: 'AUDIENCE',
      status: 'ACTIVE',
    },
  });

  const token = jwt.sign(
    { sub: user.id, email: user.email, role: 'AUDIENCE', organizationId: null },
    jwtSecret,
    { expiresIn: '1h' }
  );

  // 2. Khởi chạy API Server động
  console.log('2. Khởi chạy API Server trên cổng ngẫu nhiên...');
  const app = await NestFactory.create(AppModule, { logger: false });
  await app.listen(0);
  const address = app.getHttpServer().address();
  if (!address || typeof address !== 'object') {
    throw new Error('Failed to bind server port');
  }
  const baseUrl = `http://127.0.0.1:${address.port}`;
  console.log(`- Server đang chạy tại: ${baseUrl}`);

  // 3. Gửi liên tiếp 4 request tới /api/v1/orders/hold
  console.log('3. Gửi liên tiếp 4 request đặt giữ vé (Vượt quá giới hạn 2 request/10s)...');
  const path = '/api/v1/orders/hold';
  const options = {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'authorization': `Bearer ${token}`,
    },
  };

  const body = {
    concertId: '00000000-0000-0000-0000-000000000000', // Concert ảo không tồn tại để xem nó đi qua được middleware rate limit
    items: [],
  };

  const results: any[] = [];
  for (let i = 0; i < 4; i++) {
    const res = await requestJson(`${baseUrl}${path}`, options, body);
    results.push(res);
    console.log(`- Request ${i + 1}: HTTP Status = ${res.status}`);
  }

  // 4. Phân tích kết quả
  // Request 1 và 2 sẽ vượt qua middleware rate limit (và lỗi 404/400 ở tầng nghiệp vụ vì concert ID ảo)
  // Request 3 và 4 phải bị chặn đứng ngay lập tức tại middleware với mã lỗi HTTP 429 (Too Many Requests)
  const rateLimitedCount = results.filter(r => r.status === 429).length;

  console.log('\n=== KẾT QUẢ KIỂM THỬ RATE LIMIT ===');
  console.log(`- Tổng số yêu cầu gửi lên: ${results.length}`);
  console.log(`- Số yêu cầu bị chặn 429 (Too Many Requests): ${rateLimitedCount}`);

  // 5. Dọn dẹp dữ liệu
  console.log('\n5. Đang dọn dẹp dữ liệu test...');
  await app.close();
  await prisma.user.delete({ where: { id: user.id } });
  console.log('=== Dọn dẹp thành công! ===');

  if (rateLimitedCount >= 2) {
    console.log('\n✅ ĐẠT YÊU CẦU: Middleware Rate Limiting hoạt động chính xác. Chặn đứng các request vượt ngưỡng cấu hình với lỗi HTTP 429.');
  } else {
    console.log('\n❌ THẤT BẠI: Rate Limiting không hoạt động đúng hoặc không chặn khi vượt ngưỡng!');
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Lỗi khi chạy rate limit test:', err);
  process.exit(1);
});
