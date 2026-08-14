import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { PaymentService } from '../src/modules/payment/payment.service';
import http from 'http';

async function getRequest(url: string): Promise<{ status: number; data: any }> {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let body = '';
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode || 0, data: JSON.parse(body) });
        } catch {
          resolve({ status: res.statusCode || 0, data: body });
        }
      });
    }).on('error', reject);
  });
}

async function main() {
  console.log('=== Khởi chạy Circuit Breaker & Graceful Degradation Test (IM13) ===');

  // 1. Khởi chạy NestJS API Server động
  console.log('1. Khởi chạy API Server trên cổng ngẫu nhiên...');
  const app = await NestFactory.create(AppModule, { logger: false });
  await app.listen(0);
  const paymentService = app.get(PaymentService);
  const address = app.getHttpServer().address();
  if (!address || typeof address !== 'object') {
    throw new Error('Failed to bind server port');
  }
  const baseUrl = `http://127.0.0.1:${address.port}`;
  console.log(`- Server đang chạy tại: ${baseUrl}`);

  // 2. Kiểm tra xem luồng xem concert bình thường có hoạt động không
  console.log('\n2. Kiểm tra luồng xem danh sách concert (Trang chủ/Concert list)...');
  const concertListRes = await getRequest(`${baseUrl}/api/v1/concerts`);
  console.log(`- HTTP Status = ${concertListRes.status} (Kỳ vọng: 200)`);
  if (concertListRes.status !== 200) {
    console.error('❌ Lỗi: Không thể lấy danh sách concert.');
    await app.close();
    process.exit(1);
  }
  console.log('✅ Luồng xem concert hoạt động bình thường.');

  // 3. Giả lập gọi API cổng thanh toán VNPAY bị lỗi liên tiếp 5 lần để ngắt mạch (Trip Breaker)
  console.log('\n3. Giả lập cổng thanh toán VNPAY bị lỗi liên tiếp 5 lần...');
  const gateway = 'vnpay';
  for (let i = 1; i <= 5; i++) {
    await paymentService.recordFailure(gateway);
  }

  // 4. Kiểm tra xem mạch có chuyển sang trạng thái OPEN chưa
  console.log('\n4. Kiểm tra trạng thái mạch sau khi lỗi 5 lần...');
  let isCircuitOpen = false;
  try {
    await paymentService.checkCircuitBreaker(gateway);
  } catch (error: any) {
    if (error.errorCode === 'PAYMENT_GATEWAY_MAINTENANCE') {
      isCircuitOpen = true;
      console.log(`✅ Thành công! Circuit Breaker đã chặn lỗi từ cổng thanh toán VNPAY:`, error.message);
    } else {
      console.log(`❌ Lỗi không mong đợi:`, error.message);
    }
  }

  // 5. Kiểm tra tính năng cô lập lỗi (Graceful Degradation): Trang xem concert vẫn phải hoạt động bình thường!
  console.log('\n5. Kiểm tra tính năng Cô lập lỗi (Graceful Degradation)...');
  console.log('   (Dù cổng thanh toán đang bảo trì do lỗi, trang xem concert vẫn phải truy cập được)');
  const concertListResAfterTrip = await getRequest(`${baseUrl}/api/v1/concerts`);
  console.log(`- HTTP Status = ${concertListResAfterTrip.status} (Kỳ vọng: 200)`);

  // 6. Reset Circuit Breaker để trả lại trạng thái bình thường cho hệ thống
  console.log('\n6. Đang khôi phục lại Circuit Breaker (Reset về CLOSED)...');
  await paymentService.recordSuccess(gateway);
  await app.close();

  if (isCircuitOpen && concertListResAfterTrip.status === 200) {
    console.log('\n✅ ĐẠT YÊU CẦU: Circuit Breaker tự động chuyển sang OPEN để cô lập lỗi thanh toán, trong khi luồng xem concert vẫn hoạt động bình thường (Graceful Degradation).');
  } else {
    console.log('\n❌ THẤT BẠI: Circuit Breaker không ngắt mạch hoặc làm sập luôn luồng xem concert!');
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Lỗi khi chạy circuit breaker test:', err);
  process.exit(1);
});
