import { prisma } from '../src/shared/lib/prisma';
import redisClient, { runRedisOperation } from '../src/shared/lib/redis';
import { WaitingRoomService } from '../src/modules/concert/waiting-room.service';

const waitingRoomService = new WaitingRoomService(prisma as any);

async function main() {
  console.log('=== Khởi chạy Waiting Room 80,000 Sessions Test ===');

  // 1. Tạo tổ chức và concert thử nghiệm
  console.log('1. Thiết lập Concert và cấu hình Waiting Room...');
  const org = await prisma.organization.create({
    data: { name: `Test Org 80k Queue ${Date.now()}` },
  });

  const organizer = await prisma.user.create({
    data: {
      email: `organizer-80k-${Date.now()}@example.com`,
      passwordHash: 'dummy',
      fullName: 'Organizer 80k',
      role: 'ORGANIZER',
      organizationId: org.id,
      status: 'ACTIVE',
    },
  });

  const concert = await prisma.concert.create({
    data: {
      eventCode: `CONC-80K-${Date.now()}`,
      organizerId: organizer.id,
      organizationId: org.id,
      name: 'Super Show 80,000 Users',
      venue: 'National Stadium',
      startAt: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
      saleOpenAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
      status: 'ON_SALE',
    },
  });

  // Kích hoạt Waiting Room cho Concert ID này
  process.env.WAITING_ROOM_ENABLED_CONCERT_IDS = concert.id;
  process.env.WAITING_ROOM_RELEASE_PER_MINUTE = '500';

  console.log(`- Concert ID: ${concert.id}`);
  console.log(`- WAITING_ROOM_ENABLED_CONCERT_IDS: ${process.env.WAITING_ROOM_ENABLED_CONCERT_IDS}`);

  // 2. Sử dụng Redis Pipelining đẩy 80,000 users vào hàng đợi
  console.log('2. Đang nạp 80,000 user sessions vào hàng đợi Redis ZSET (Pipelined)...');
  const queueKey = `waiting:${concert.id}:queue`;
  
  const startTime = Date.now();
  const batchSize = 10000;
  for (let i = 0; i < 80000; i += batchSize) {
    const multi = redisClient.multi();
    for (let j = i; j < i + batchSize; j++) {
      multi.zAdd(queueKey, {
        score: Date.now() + j,
        value: `user-80k-${j}`,
      });
    }
    await runRedisOperation(() => multi.exec());
  }
  const endTime = Date.now();
  console.log(`- Đã nạp xong 80,000 users trong: ${(endTime - startTime) / 1000} giây.`);

  // 3. Kiểm tra độ lớn hàng chờ và Rank của người thứ 80,000
  console.log('3. Truy vấn kiểm tra hàng chờ...');
  const queueLength = await runRedisOperation(() => redisClient.zCard(queueKey));
  console.log(`- Tổng số người trong hàng chờ (ZCard): ${queueLength}`);

  const rank80k = await runRedisOperation(() => redisClient.zRank(queueKey, 'user-80k-79999'));
  console.log(`- Vị trí (Rank) của người thứ 80,000: ${rank80k !== null ? rank80k + 1 : 'Không tìm thấy'}`);

  // 4. Chạy giải phóng hàng chờ giải phóng 500 người đầu tiên vào mua vé
  console.log('4. Tiến hành giải phóng 500 người đầu tiên (Batch Release)...');
  const releaseRes = await waitingRoomService.releaseForConcert(concert.id);
  console.log(`- Số lượng đã giải phóng: ${releaseRes.released}`);

  // 5. Xác minh trạng thái sau giải phóng
  console.log('5. Xác minh trạng thái hàng chờ sau giải phóng...');
  const newQueueLength = await runRedisOperation(() => redisClient.zCard(queueKey));
  console.log(`- Độ lớn hàng chờ còn lại: ${newQueueLength} (Kỳ vọng: 79500)`);

  // Người đầu tiên (user-80k-0) phải nhận trạng thái READY
  const firstUserStatus = await waitingRoomService.getStatus(concert.id, 'user-80k-0');
  console.log(`- Trạng thái người thứ 1 (user-80k-0):`, firstUserStatus);

  // Người thứ 501 (user-80k-500) nay sẽ leo lên vị trí số 1 của hàng chờ
  const nextUserStatus = await waitingRoomService.getStatus(concert.id, 'user-80k-500');
  console.log(`- Trạng thái người thứ 501 (user-80k-500):`, nextUserStatus);

  // 6. Dọn dẹp dữ liệu
  console.log('\n6. Đang dọn dẹp dữ liệu test...');
  await runRedisOperation(() => redisClient.del(queueKey));
  
  // Dọn dẹp checkout tokens
  const cleanMulti = redisClient.multi();
  for (let i = 0; i < 500; i++) {
    cleanMulti.del(`checkout_token:${concert.id}:user-80k-${i}`);
  }
  await runRedisOperation(() => cleanMulti.exec());

  await prisma.concert.delete({ where: { id: concert.id } });
  await prisma.user.delete({ where: { id: organizer.id } });
  await prisma.organization.delete({ where: { id: org.id } });

  console.log('=== Dọn dẹp thành công! ===');

  if (queueLength === 80000 && newQueueLength === 79500 && firstUserStatus.status === 'READY' && nextUserStatus.status === 'WAITING' && nextUserStatus.position === 1) {
    console.log('\n✅ ĐẠT YÊU CẦU: Hệ thống Waiting Room chịu tải 80,000 người hoạt động cực kỳ mượt mà, phân phối token và tính toán vị trí xếp hàng chính xác tuyệt đối!');
  } else {
    console.log('\n❌ THẤT BẠI: Dữ liệu queue hoặc token phân phối bị sai lệch!');
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Lỗi khi chạy Waiting Room 80k test:', err);
  process.exit(1);
});
