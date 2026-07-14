import { prisma } from '../shared/lib/prisma';

async function main() {
  console.log('=== Đang dọn dẹp các bản ghi rác từ đợt chạy Load Test ===');

  // Tìm tất cả các concert có tên "Autocannon Concert Load Test"
  const testConcerts = await prisma.concert.findMany({
    where: {
      name: 'Autocannon Concert Load Test',
    },
    select: { id: true },
  });

  const concertIds = testConcerts.map((c) => c.id);

  if (concertIds.length === 0) {
    console.log('Không tìm thấy bản ghi Concert test nào còn sót lại.');
  } else {
    console.log(`Tìm thấy ${concertIds.length} Concert test. Bắt đầu xóa...`);

    // Tìm tất cả các orders liên quan đến các concert này
    const orders = await prisma.order.findMany({
      where: {
        concertId: { in: concertIds },
      },
      select: { id: true },
    });

    const orderIds = orders.map((o) => o.id);

    if (orderIds.length > 0) {
      // Xóa Payments liên quan
      const deletedPayments = await prisma.payment.deleteMany({
        where: {
          orderId: { in: orderIds },
        },
      });
      console.log(`- Đã xóa ${deletedPayments.count} bản ghi Payment`);

      // Xóa Tickets liên quan
      const deletedTickets = await prisma.ticket.deleteMany({
        where: {
          orderItem: {
            orderId: { in: orderIds },
          },
        },
      });
      console.log(`- Đã xóa ${deletedTickets.count} bản ghi Ticket`);

      // Xóa OrderItems liên quan
      const deletedOrderItems = await prisma.orderItem.deleteMany({
        where: {
          orderId: { in: orderIds },
        },
      });
      console.log(`- Đã xóa ${deletedOrderItems.count} bản ghi OrderItem`);

      // Xóa Orders
      const deletedOrders = await prisma.order.deleteMany({
        where: {
          id: { in: orderIds },
        },
      });
      console.log(`- Đã xóa ${deletedOrders.count} bản ghi Order`);
    }

    // Xóa TicketInventory
    const deletedInventories = await prisma.ticketInventory.deleteMany({
      where: {
        ticketType: {
          concertId: { in: concertIds },
        },
      },
    });
    console.log(`- Đã xóa ${deletedInventories.count} bản ghi TicketInventory`);

    // Xóa TicketType
    const deletedTicketTypes = await prisma.ticketType.deleteMany({
      where: {
        concertId: { in: concertIds },
      },
    });
    console.log(`- Đã xóa ${deletedTicketTypes.count} bản ghi TicketType`);

    // Xóa Concerts
    const deletedConcerts = await prisma.concert.deleteMany({
      where: {
        id: { in: concertIds },
      },
    });
    console.log(`- Đã xóa ${deletedConcerts.count} bản ghi Concert`);
  }

  // Xóa tài khoản người dùng test
  const deletedUsers = await prisma.user.deleteMany({
    where: {
      OR: [
        { email: { startsWith: 'aud-ac-' } },
        { email: { startsWith: 'organizer-ac-' } },
      ],
    },
  });
  console.log(`- Đã xóa ${deletedUsers.count} tài khoản người dùng test`);

  // Xóa tổ chức test
  const deletedOrgs = await prisma.organization.deleteMany({
    where: {
      name: { startsWith: 'Test Org Autocannon' },
    },
  });
  console.log(`- Đã xóa ${deletedOrgs.count} tổ chức test`);

  console.log('=== Hoàn tất dọn dẹp Database sạch sẽ! ===');
}

main()
  .catch((err) => {
    console.error('Lỗi khi dọn dẹp:', err);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
