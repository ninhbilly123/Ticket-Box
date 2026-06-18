import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Cleaning up existing database records...');
  // Xóa dữ liệu cũ theo thứ tự quan hệ bảng để tránh lỗi Foreign Key
  await prisma.checkinLog.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.vipGuest.deleteMany();
  await prisma.ticket.deleteMany();
  await prisma.payment.deleteMany(); // Xóa bảng payments mới
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.ticketType.deleteMany();
  await prisma.concertArtist.deleteMany();
  await prisma.artist.deleteMany();
  await prisma.concert.deleteMany();
  await prisma.user.deleteMany();

  console.log('Creating seed users...');
  
  // 1. Tạo tài khoản Ban tổ chức (organizers)
  const organizer1 = await prisma.user.create({
    data: {
      email: 'organizer@ticketbox.com',
      passwordHash: '$2b$10$xyz...', 
      fullName: 'Ban Tổ Chức Sky Tour',
      phone: '0987654321',
      role: 'organizer',
    },
  });

  const organizer2 = await prisma.user.create({
    data: {
      email: 'organizer2@ticketbox.com',
      passwordHash: '$2b$10$xyz...',
      fullName: 'M-TP Entertainment',
      phone: '0966778899',
      role: 'organizer',
    },
  });

  // 2. Tạo tài khoản nhân viên soát vé (gate_staff)
  const staff1 = await prisma.user.create({
    data: {
      id: '7abe2001-f718-462d-b76a-18507d442df7', // Cố định ID của Staff 1 để đồng bộ thiết bị checkin dev
      email: 'staff1@ticketbox.com',
      passwordHash: '$2b$10$xyz...',
      fullName: 'Nguyễn Văn Soát Vé (Cổng A)',
      phone: '0912345678',
      role: 'gate_staff',
    },
  });

  const staff2 = await prisma.user.create({
    data: {
      email: 'staff2@ticketbox.com',
      passwordHash: '$2b$10$xyz...',
      fullName: 'Trần Thị Kiểm Vé (Cổng B)',
      phone: '0912112233',
      role: 'gate_staff',
    },
  });

  const staff3 = await prisma.user.create({
    data: {
      email: 'staff3@ticketbox.com',
      passwordHash: '$2b$10$xyz...',
      fullName: 'Lê Văn Quét Mã (Cổng VIP)',
      phone: '0912889900',
      role: 'gate_staff',
    },
  });

  // 3. Tạo tài khoản khán giả (audience/customers)
  const customers = [];
  const customerEmails = [
    'customer@ticketbox.com',
    'anh.nguyen@gmail.com',
    'binh.tran@gmail.com',
    'chi.le@gmail.com',
    'dung.pham@gmail.com',
    'em.hoang@gmail.com',
  ];
  const customerNames = [
    'Nguyễn Văn Khách Hàng',
    'Nguyễn Đức Anh',
    'Trần Thanh Bình',
    'Lê Mỹ Chi',
    'Phạm Tuấn Dũng',
    'Hoàng Khánh Em',
  ];

  for (let i = 0; i < customerEmails.length; i++) {
    const c = await prisma.user.create({
      data: {
        email: customerEmails[i],
        passwordHash: '$2b$10$xyz...',
        fullName: customerNames[i],
        phone: `09334455${i}${i}`,
        role: 'audience',
      },
    });
    customers.push(c);
  }

  console.log('Creating seed artists...');
  // 4. Tạo các Nghệ sĩ (Artist)
  const artistsData = [
    { name: 'Sơn Tùng M-TP', bio: 'Nghệ sĩ Sơn Tùng M-TP là ca sĩ, nhạc sĩ hàng đầu Việt Nam.', pdf: '/assets/presskits/sontung-mtp.pdf' },
    { name: 'Đen Vâu', bio: 'Nhạc sĩ, Rapper nổi tiếng với những bài hát tự sự, mộc mạc đi vào lòng người.', pdf: '/assets/presskits/denvau.pdf' },
    { name: 'Mỹ Tâm', bio: 'Họa mi tóc nâu - Một trong những ca sĩ pop hàng đầu có sức ảnh hưởng bền bỉ nhất.', pdf: '/assets/presskits/mytam.pdf' },
    { name: 'Hoàng Thùy Linh', bio: 'Nữ ca sĩ tiên phong mang chất liệu dân gian đương đại vào nhạc Pop Dance.', pdf: '/assets/presskits/hoangthuylinh.pdf' },
    { name: 'Suboi', bio: 'Nữ hoàng Hip Hop Việt Nam - Rapper tài năng được bạn bè quốc tế đón nhận.', pdf: '/assets/presskits/suboi.pdf' },
  ];

  const artists = [];
  for (const art of artistsData) {
    const a = await prisma.artist.create({
      data: {
        name: art.name,
        bioGenerated: art.bio,
        pdfSourceUrl: art.pdf,
      },
    });
    artists.push(a);
  }

  console.log('Creating seed concerts...');
  // 5. Tạo 6 Concert (5 Concert tương lai để hiển thị trang chủ, 1 Concert quá khứ)
  const concertsData = [
    {
      name: 'Sky Tour 2026',
      venue: 'Sân vận động Mỹ Đình, Hà Nội',
      startDaysOffset: 5, // 5 ngày sau
      description: 'Concert hoành tráng nhất năm 2026 của Sơn Tùng M-TP.',
      map: '/assets/seatmaps/skytour-seatmap.svg',
      artistIdx: 0,
      orgId: organizer2.id,
    },
    {
      name: 'Show của Đen 2026',
      venue: 'Nhà thi đấu Phú Thọ, TP. Hồ Chí Minh',
      startDaysOffset: 12,
      description: 'Live concert ấm cúng mang phong cách đậm chất rapper Đen Vâu.',
      map: '/assets/seatmaps/denvau-seatmap.svg',
      artistIdx: 1,
      orgId: organizer1.id,
    },
    {
      name: 'Mỹ Tâm - Tri Âm Live 2026',
      venue: 'Sân vận động Quân khu 7, TP. Hồ Chí Minh',
      startDaysOffset: 25,
      description: 'Đêm nhạc kỷ niệm chặng đường ca hát của Họa mi tóc nâu.',
      map: '/assets/seatmaps/mytam-seatmap.svg',
      artistIdx: 2,
      orgId: organizer1.id,
    },
    {
      name: 'Hoàng Thùy Linh - Vietnamese Concert 2026',
      venue: 'Trung tâm Hội nghị Quốc gia, Hà Nội',
      startDaysOffset: 18,
      description: 'Hành trình âm nhạc kết hợp văn hóa truyền thống cực kỳ mãn nhãn.',
      map: '/assets/seatmaps/hoangthuylinh-seatmap.svg',
      artistIdx: 3,
      orgId: organizer1.id,
    },
    {
      name: 'Suboi & Friends Club Show',
      venue: 'Club The Link, Hà Nội',
      startDaysOffset: 8,
      description: 'Đêm rap cực bốc và thân mật với sự tham gia của dàn khách mời đình đám.',
      map: '/assets/seatmaps/suboi-seatmap.svg',
      artistIdx: 4,
      orgId: organizer2.id,
    },
    {
      name: 'Concert Kỷ Niệm 2025 (Đã diễn ra)',
      venue: 'Nhà hát lớn Hà Nội',
      startDaysOffset: -30, // 30 ngày trước (Past Concert)
      description: 'Đêm nhạc hội tụ các ca khúc xưa cũ.',
      map: '/assets/seatmaps/past-seatmap.svg',
      artistIdx: 2,
      orgId: organizer1.id,
    },
  ];

  const concerts = [];
  for (const cData of concertsData) {
    const startAt = new Date(Date.now() + cData.startDaysOffset * 24 * 60 * 60 * 1000);
    const saleOpenAt = new Date(startAt.getTime() - 15 * 24 * 60 * 60 * 1000); // Mở bán trước 15 ngày
    
    const c = await prisma.concert.create({
      data: {
        organizerId: cData.orgId,
        name: cData.name,
        venue: cData.venue,
        startAt,
        saleOpenAt,
        status: 'published',
        description: cData.description,
        svgSeatingMap: cData.map,
      },
    });

    // Liên kết concert với nghệ sĩ
    await prisma.concertArtist.create({
      data: {
        concertId: c.id,
        artistId: artists[cData.artistIdx].id,
      },
    });

    concerts.push(c);
  }

  console.log('Creating ticket types for each concert...');
  // 6. Tạo phân hạng vé (TicketType) cho tất cả các concert
  const ticketClassNames = ['SVIP', 'VIP', 'CAT1', 'CAT2', 'GA'];
  const ticketClassPrices = [4000000, 2500000, 1500000, 1000000, 600000];
  const ticketClassQuantities = [80, 200, 400, 500, 800];
  
  // Lưu trữ TicketType ID để dùng tạo Order
  const ticketTypesMap: Record<string, string[]> = {};

  for (const c of concerts) {
    ticketTypesMap[c.id] = [];
    for (let j = 0; j < ticketClassNames.length; j++) {
      const tt = await prisma.ticketType.create({
        data: {
          concertId: c.id,
          name: ticketClassNames[j],
          price: ticketClassPrices[j],
          totalQuantity: ticketClassQuantities[j],
          maxPerAccount: j === 0 ? 2 : 4, // SVIP giới hạn 2 vé/acc, các hạng khác 4 vé
        },
      });
      ticketTypesMap[c.id].push(tt.id);
    }
  }

  console.log('Creating seed orders and purchasing tickets...');
  // 7. Tạo đơn hàng và vé đã mua cho một số khách hàng để làm dữ liệu check-in
  
  // --- Concert 1: Sky Tour 2026 (Khách 0 mua 2 vé SVIP) - ĐÃ THANH TOÁN
  const c1_ticketTypes = ticketTypesMap[concerts[0].id]; // Hạng SVIP là index 0
  const order1 = await prisma.order.create({
    data: {
      userId: customers[0].id,
      concertId: concerts[0].id,
      status: 'paid',
      totalAmount: 8000000, // 2 vé SVIP
      idempotencyKey: 'seed_order_skytour_customer0',
      paidAt: new Date(),
    },
  });

  const orderItem1 = await prisma.orderItem.create({
    data: {
      orderId: order1.id,
      ticketTypeId: c1_ticketTypes[0], // SVIP
      quantity: 2,
      unitPrice: 4000000,
    },
  });

  // Vé 1: Hợp lệ chưa quét
  const ticket1 = await prisma.ticket.create({
    data: {
      orderItemId: orderItem1.id,
      userId: customers[0].id,
      qrCode: 'TICKET-SKYT-SVIP-001',
      status: 'valid',
      seatNumber: 'SVIP-A01',
    },
  });

  // Vé 2: Vé đã sử dụng (đã quét checkin từ trước) để test cảnh báo quét trùng
  const ticket2 = await prisma.ticket.create({
    data: {
      orderItemId: orderItem1.id,
      userId: customers[0].id,
      qrCode: 'TICKET-SKYT-SVIP-002',
      status: 'used',
      usedAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // đã quét cách đây 2 tiếng
      seatNumber: 'SVIP-A02',
    },
  });

  // Lưu lịch sử checkin cho Vé 2
  await prisma.checkinLog.create({
    data: {
      ticketId: ticket2.id,
      gateStaffId: staff1.id,
      deviceId: 'GATE-DEVICE-01',
      synced: true,
      scannedAtLocal: new Date(Date.now() - 2 * 60 * 60 * 1000),
      syncedAt: new Date(),
    },
  });

  // Giao dịch thanh toán của Order 1
  await prisma.payment.create({
    data: {
      orderId: order1.id,
      paymentGateway: 'MOMO',
      amount: 8000000,
      status: 'SUCCESS',
      transactionId: 'MOMO_TX_000001',
      responseCode: '0',
    },
  });


  // --- Concert 2: Show của Đen (Khách 1 mua 1 vé VIP và 2 vé GA) - ĐÃ THANH TOÁN
  const c2_ticketTypes = ticketTypesMap[concerts[1].id];
  const order2 = await prisma.order.create({
    data: {
      userId: customers[1].id,
      concertId: concerts[1].id,
      status: 'paid',
      totalAmount: 3700000, // 1*2.5tr (VIP) + 2*600k (GA)
      idempotencyKey: 'seed_order_denvau_customer1',
      paidAt: new Date(),
    },
  });

  const orderItem2_vip = await prisma.orderItem.create({
    data: {
      orderId: order2.id,
      ticketTypeId: c2_ticketTypes[1], // VIP
      quantity: 1,
      unitPrice: 2500000,
    },
  });

  const orderItem2_ga = await prisma.orderItem.create({
    data: {
      orderId: order2.id,
      ticketTypeId: c2_ticketTypes[4], // GA
      quantity: 2,
      unitPrice: 600000,
    },
  });

  await prisma.ticket.create({
    data: {
      orderItemId: orderItem2_vip.id,
      userId: customers[1].id,
      qrCode: 'TICKET-DENV-VIP-101',
      status: 'valid',
      seatNumber: 'VIP-B01',
    },
  });

  await prisma.ticket.create({
    data: {
      orderItemId: orderItem2_ga.id,
      userId: customers[1].id,
      qrCode: 'TICKET-DENV-GA-102',
      status: 'valid',
      seatNumber: 'GA-E102',
    },
  });

  await prisma.ticket.create({
    data: {
      orderItemId: orderItem2_ga.id,
      userId: customers[1].id,
      qrCode: 'TICKET-DENV-GA-103',
      status: 'valid',
      seatNumber: 'GA-E103',
    },
  });

  // Giao dịch thanh toán của Order 2
  await prisma.payment.create({
    data: {
      orderId: order2.id,
      paymentGateway: 'VNPAY',
      amount: 3700000,
      status: 'SUCCESS',
      transactionId: 'VNPAY_TX_000002',
      responseCode: '00',
    },
  });


  // --- Concert 3: Mỹ Tâm - Tri Âm (Khách 2 mua 1 vé CAT1) - ĐÃ THANH TOÁN
  const c3_ticketTypes = ticketTypesMap[concerts[2].id];
  const order3 = await prisma.order.create({
    data: {
      userId: customers[2].id,
      concertId: concerts[2].id,
      status: 'paid',
      totalAmount: 1500000,
      idempotencyKey: 'seed_order_mytam_customer2',
      paidAt: new Date(),
    },
  });

  const orderItem3 = await prisma.orderItem.create({
    data: {
      orderId: order3.id,
      ticketTypeId: c3_ticketTypes[2], // CAT1
      quantity: 1,
      unitPrice: 1500000,
    },
  });

  await prisma.ticket.create({
    data: {
      orderItemId: orderItem3.id,
      userId: customers[2].id,
      qrCode: 'TICKET-MYTAM-CAT1-201',
      status: 'valid',
      seatNumber: 'CAT1-C201',
    },
  });

  // Giao dịch thanh toán của Order 3
  await prisma.payment.create({
    data: {
      orderId: order3.id,
      paymentGateway: 'VNPAY',
      amount: 1500000,
      status: 'SUCCESS',
      transactionId: 'VNPAY_TX_000003',
      responseCode: '00',
    },
  });


  // --- Concert 4: Vietnamese Concert (Khách 3 mua 1 vé VIP) - ĐÃ THANH TOÁN
  const c4_ticketTypes = ticketTypesMap[concerts[3].id];
  const order4 = await prisma.order.create({
    data: {
      userId: customers[3].id,
      concertId: concerts[3].id,
      status: 'paid',
      totalAmount: 2500000,
      idempotencyKey: 'seed_order_htl_customer3',
      paidAt: new Date(),
    },
  });

  const orderItem4 = await prisma.orderItem.create({
    data: {
      orderId: order4.id,
      ticketTypeId: c4_ticketTypes[1], // VIP
      quantity: 1,
      unitPrice: 2500000,
    },
  });

  await prisma.ticket.create({
    data: {
      orderItemId: orderItem4.id,
      userId: customers[3].id,
      qrCode: 'TICKET-HTL-VIP-301',
      status: 'valid',
      seatNumber: 'VIP-D301',
    },
  });

  // Giao dịch thanh toán của Order 4
  await prisma.payment.create({
    data: {
      orderId: order4.id,
      paymentGateway: 'MOMO',
      amount: 2500000,
      status: 'SUCCESS',
      transactionId: 'MOMO_TX_000004',
      responseCode: '0',
    },
  });


  // --- Concert 1: Sky Tour 2026 (Khách 4 mua 1 vé GA) - CHỜ THANH TOÁN (PENDING)
  const order5 = await prisma.order.create({
    data: {
      userId: customers[4].id,
      concertId: concerts[0].id,
      status: 'pending',
      totalAmount: 600000, // 1 vé GA
      idempotencyKey: 'seed_order_skytour_customer4',
    },
  });

  const orderItem5 = await prisma.orderItem.create({
    data: {
      orderId: order5.id,
      ticketTypeId: c1_ticketTypes[4], // GA
      quantity: 1,
      unitPrice: 600000,
    },
  });

  await prisma.ticket.create({
    data: {
      orderItemId: orderItem5.id,
      userId: customers[4].id,
      qrCode: 'TICKET-SKYT-GA-401',
      status: 'valid', // Tạm giữ
      seatNumber: 'GA-F401',
    },
  });

  // Giao dịch thanh toán của Order 5
  await prisma.payment.create({
    data: {
      orderId: order5.id,
      paymentGateway: 'MOMO',
      amount: 600000,
      status: 'PENDING',
    },
  });


  // --- Concert 2: Show của Đen (Khách 5 mua 1 vé SVIP) - THANH TOÁN THẤT BẠI
  const order6 = await prisma.order.create({
    data: {
      userId: customers[5].id,
      concertId: concerts[1].id,
      status: 'failed',
      totalAmount: 4000000, // 1 vé SVIP
      idempotencyKey: 'seed_order_denvau_customer5',
    },
  });

  // Giao dịch thanh toán thất bại của Order 6
  await prisma.payment.create({
    data: {
      orderId: order6.id,
      paymentGateway: 'VNPAY',
      amount: 4000000,
      status: 'FAILED',
      transactionId: 'VNPAY_TX_FAILED_01',
      responseCode: '99',
    },
  });


  // --- Concert 1: Sky Tour 2026 (Khách 2 mua 2 vé GA) - ĐÃ THANH TOÁN
  const order7 = await prisma.order.create({
    data: {
      userId: customers[2].id,
      concertId: concerts[0].id,
      status: 'paid',
      totalAmount: 1200000, // 2 vé GA
      idempotencyKey: 'seed_order_skytour_customer2_ga',
      paidAt: new Date(),
    },
  });

  const orderItem7 = await prisma.orderItem.create({
    data: {
      orderId: order7.id,
      ticketTypeId: c1_ticketTypes[4], // GA
      quantity: 2,
      unitPrice: 600000,
    },
  });

  const ticket9 = await prisma.ticket.create({
    data: {
      orderItemId: orderItem7.id,
      userId: customers[2].id,
      qrCode: 'TICKET-SKYT-GA-005',
      status: 'valid',
      seatNumber: 'GA-F05',
    },
  });

  const ticket10 = await prisma.ticket.create({
    data: {
      orderItemId: orderItem7.id,
      userId: customers[2].id,
      qrCode: 'TICKET-SKYT-GA-006',
      status: 'used',
      usedAt: new Date(Date.now() - 1 * 60 * 60 * 1000), // đã quét cách đây 1 tiếng
      seatNumber: 'GA-F06',
    },
  });

  // Lưu lịch sử checkin cho Vé 10
  await prisma.checkinLog.create({
    data: {
      ticketId: ticket10.id,
      gateStaffId: staff2.id,
      deviceId: 'GATE-DEVICE-02',
      synced: true,
      scannedAtLocal: new Date(Date.now() - 1 * 60 * 60 * 1000),
      syncedAt: new Date(),
    },
  });

  // Giao dịch thanh toán của Order 7
  await prisma.payment.create({
    data: {
      orderId: order7.id,
      paymentGateway: 'MOMO',
      amount: 1200000,
      status: 'SUCCESS',
      transactionId: 'MOMO_TX_000007',
      responseCode: '0',
    },
  });


  // --- Concert 1: Sky Tour 2026 (Khách 3 mua 1 vé VIP) - ĐÃ THANH TOÁN
  const order8 = await prisma.order.create({
    data: {
      userId: customers[3].id,
      concertId: concerts[0].id,
      status: 'paid',
      totalAmount: 2500000, // 1 vé VIP
      idempotencyKey: 'seed_order_skytour_customer3_vip',
      paidAt: new Date(),
    },
  });

  const orderItem8 = await prisma.orderItem.create({
    data: {
      orderId: order8.id,
      ticketTypeId: c1_ticketTypes[1], // VIP
      quantity: 1,
      unitPrice: 2500000,
    },
  });

  await prisma.ticket.create({
    data: {
      orderItemId: orderItem8.id,
      userId: customers[3].id,
      qrCode: 'TICKET-SKYT-VIP-007',
      status: 'valid',
      seatNumber: 'VIP-B07',
    },
  });

  // Giao dịch thanh toán của Order 8
  await prisma.payment.create({
    data: {
      orderId: order8.id,
      paymentGateway: 'VNPAY',
      amount: 2500000,
      status: 'SUCCESS',
      transactionId: 'VNPAY_TX_000008',
      responseCode: '00',
    },
  });

  console.log('Creating seed VIP guests for VIP list checkin...');
  // 8. Tạo danh sách khách mời VIP (VipGuests)
  
  // Tạo 6 VIP Guests cho Sky Tour 2026
  const skytourVips = [
    { name: 'Nguyễn Hồng Đăng (Đại biểu)', contact: '0901234567', zone: 'SVIP' },
    { name: 'Bà Trần Kim Chi (Báo chí)', contact: 'reporter_chi@gmail.com', zone: 'VIP' },
    { name: 'Ca sĩ MONO (Khách mời)', contact: 'mono.official@mtpent.vn', zone: 'SVIP' },
    { name: 'Phạm Nhật Vượng (Đặc biệt)', contact: 'vuong.pn@vingroup.net', zone: 'SVIP' },
    { name: 'Đặng Lê Nguyên Vũ (Đặc biệt)', contact: '0988888888', zone: 'VIP' },
    { name: 'Chị Mai Phương Thúy (Hoa hậu)', contact: 'mphuongthuy@gmail.com', zone: 'CAT1' },
  ];

  for (const vip of skytourVips) {
    await prisma.vipGuest.create({
      data: {
        concertId: concerts[0].id,
        fullName: vip.name,
        identifier: vip.contact,
        zone: vip.zone,
        csvBatchId: 'batch_seed_01',
      },
    });
  }

  // Tạo 5 VIP Guests cho Show của Đen Vâu
  const denvauVips = [
    { name: 'Nhạc sĩ Trần Tiến (Cựu trào)', contact: 'trantien@gmail.com', zone: 'SVIP' },
    { name: 'Ca sĩ Lynk Lee (Bạn hữu)', contact: 'lynklee@gmail.com', zone: 'VIP' },
    { name: 'Rapper Binz (Khách mời)', contact: 'binz.space@gmail.com', zone: 'SVIP' },
    { name: 'JustaTee (Sản xuất)', contact: 'justatee@gmail.com', zone: 'VIP' },
    { name: 'Rapper Karik', contact: 'karik@gmail.com', zone: 'CAT1' },
  ];

  for (const vip of denvauVips) {
    await prisma.vipGuest.create({
      data: {
        concertId: concerts[1].id,
        fullName: vip.name,
        identifier: vip.contact,
        zone: vip.zone,
        csvBatchId: 'batch_seed_02',
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
