import { prisma } from '../src/shared/lib/prisma';
import redisClient, { runRedisOperation } from '../src/shared/lib/redis';
import { waitingRoomService } from '../src/modules/concert/waiting-room.service';

async function main() {
  console.log('=== Khởi chạy Waiting Room 80,000 + 1 Sessions Test ===');

  console.log('1. Thiết lập Concert và cấu hình Waiting Room...');
  const org = await prisma.organization.create({
    data: { name: `Test Org 80k+1 Queue ${Date.now()}` },
  });

  const organizer = await prisma.user.create({
    data: {
      email: `organizer-80k-1-${Date.now()}@example.com`,
      passwordHash: 'dummy',
      fullName: 'Organizer 80k+1',
      role: 'ORGANIZER',
      organizationId: org.id,
      status: 'ACTIVE',
    },
  });

  const concert = await prisma.concert.create({
    data: {
      eventCode: `CONC-80K-1-${Date.now()}`,
      organizerId: organizer.id,
      organizationId: org.id,
      name: 'Super Show 80,000+1 Users',
      venue: 'National Stadium',
      startAt: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
      saleOpenAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
      status: 'ON_SALE',
    },
  });

  // Kích hoạt Waiting Room cho Concert ID này
  process.env.WAITING_ROOM_ENABLED_CONCERT_IDS = concert.id;

  console.log(`- Concert ID: ${concert.id}`);
  console.log(`- WAITING_ROOM_ENABLED_CONCERT_IDS: ${process.env.WAITING_ROOM_ENABLED_CONCERT_IDS}`);

  // 2. Sử dụng Redis Pipelining đẩy 80,000 users vào hàng đợi
  console.log('2. Đang nạp 80,000 user sessions vào hàng đợi Redis ZSET (Pipelined)...');
  const queueKey = `waiting:${concert.id}:queue`;
  
  const startTime = Date.now();
  const totalUsers = 80000;
  const batchSize = 10000;
  
  for (let i = 0; i < totalUsers; i += batchSize) {
    const multi = redisClient.multi();
    for (let j = i; j < i + batchSize; j++) {
      multi.zAdd(queueKey, {
        score: startTime - (totalUsers - j),
        value: `user-80k-${j}`,
      });
    }
    await runRedisOperation(() => multi.exec());
  }
  const endTime = Date.now();
  console.log(`- Đã nạp xong 80,000 users trong: ${(endTime - startTime) / 1000} giây.`);

  // 3. Giả lập người thứ 80,001 tham gia vào hàng chờ
  console.log('\n3. Giả lập người thứ 80,001 tham gia hàng chờ...');
  const specialUserId = 'user-special-80001';
  const joinResult = await waitingRoomService.join(concert.id, specialUserId);
  console.log(`- Kết quả khi tham gia:`, joinResult);

  // 4. Truy vấn trực tiếp vị trí của người thứ 80,001
  console.log('\n4. Truy vấn kiểm tra vị trí hàng chờ của người thứ 80,001...');
  const queueLength = await runRedisOperation(() => redisClient.zCard(queueKey));
  console.log(`- Tổng số người trong hàng chờ hiện tại (ZCard): ${queueLength}`);

  const rank80001 = await runRedisOperation(() => redisClient.zRank(queueKey, specialUserId));
  const position = rank80001 !== null ? rank80001 + 1 : -1;
  console.log(`- Vị trí (Position) của người thứ 80,001 trong hàng chờ: ${position}`);

  // 5. Dọn dẹp dữ liệu
  console.log('\n5. Đang dọn dẹp dữ liệu test...');
  await runRedisOperation(() => redisClient.del(queueKey));
  await prisma.concert.delete({ where: { id: concert.id } });
  await prisma.user.delete({ where: { id: organizer.id } });
  await prisma.organization.delete({ where: { id: org.id } });
  console.log('=== Dọn dẹp thành công! ===');

  if (queueLength === 80001 && position === 80001) {
    console.log('\n✅ ĐẠT YÊU CẦU: Giả lập thành công! Người thứ 80,001 xếp hàng ở đúng vị trí 80001 trên tổng số 80001 người.');
  } else {
    console.log('\n❌ THẤT BẠI: Vị trí hàng chờ không chính xác!');
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Lỗi khi chạy Waiting Room 80k+1 test:', err);
  process.exit(1);
});
