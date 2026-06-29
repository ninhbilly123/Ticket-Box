## Context

Dự án **TicketBox** yêu cầu xây dựng luồng nghiệp vụ xem thông tin và mua vé dành cho khán giả. Đây là tính năng trực tiếp chịu tải lớn khi mở bán concert (flash sale), đòi hỏi hệ thống phải đảm bảo hiệu năng cao, phản hồi nhanh và ngăn chặn được các vấn đề race condition hay vượt giới hạn mua vé của mỗi tài khoản.

Tài liệu này thiết kế kiến trúc kỹ thuật sử dụng:
- **Backend**: Node.js + Express.js + Prisma ORM
- **Database**: PostgreSQL 16
- **Caching**: Redis 7
- **Frontend**: Next.js 14 (App Router) + Tailwind CSS

## Goals / Non-Goals

**Goals:**
- Tối ưu hóa hiệu năng hiển thị số lượng vé còn lại thông qua cơ chế Redis Cache-aside (TTL 30s).
- Đảm bảo tính chính xác và an toàn dữ liệu, không xảy ra tình trạng bán quá số lượng vé khả dụng (overselling) khi có hàng ngàn người truy cập cùng lúc.
- Áp dụng kiểm tra chặt chẽ giới hạn số vé tối đa một người dùng có thể mua (per-user limit) dựa trên lịch sử giao dịch thành công.
- Tải và tương tác sơ đồ chỗ ngồi SVG linh hoạt mà không làm nặng cơ sở dữ liệu.

**Non-Goals:**
- Tích hợp cổng thanh toán thực tế (VNPAY/MoMo) - chỉ mô phỏng trạng thái thanh toán của Order (`PAID`).
- Soát vé và đồng bộ offline (thuộc phạm vi module soát vé).

## Decisions

### 1. Thiết kế Database Schema (Prisma)
Chúng ta thiết kế các Model để quản lý Concert, TicketType, Order và Ticket:

```prisma
model Concert {
  id          String       @id @default(uuid())
  title       String
  description String?
  artist      String
  dateTime    DateTime
  location    String
  seatMapUrl  String       // Đường dẫn tới file SVG sơ đồ chỗ ngồi trên CDN/Storage
  ticketTypes TicketType[]
  orders      Order[]
  createdAt   DateTime     @default(now())
  updatedAt   DateTime     @updatedAt

  @@map("concerts")
}

model TicketType {
  id                 String   @id @default(uuid())
  concertId          String
  concert            Concert  @relation(fields: [concertId], references: [id], onDelete: Cascade)
  name               String   // GA, SVIP, VIP, CAT1, CAT2...
  price              Decimal  @db.Decimal(12, 2)
  totalQuantity      Int      // Tổng số vé phát hành của hạng này
  maxLimitPerUser    Int      // Số vé tối đa 1 user được phép mua thành công
  tickets            Ticket[]
  createdAt          DateTime @default(now())
  updatedAt          DateTime @updatedAt

  @@map("ticket_types")
}

model Order {
  id          String      @id @default(uuid())
  userId      String      // Liên kết tới tài khoản người dùng
  concertId   String
  concert     Concert     @relation(fields: [concertId], references: [id])
  totalAmount Decimal     @db.Decimal(12, 2)
  status      OrderStatus @default(PENDING) // PENDING, PAID, CANCELLED
  tickets     Ticket[]
  createdAt   DateTime    @default(now())
  updatedAt   DateTime    @updatedAt

  @@map("orders")
}

enum OrderStatus {
  PENDING
  PAID
  CANCELLED
}

model Ticket {
  id           String       @id @default(uuid())
  orderId      String
  order        Order        @relation(fields: [orderId], references: [id], onDelete: Cascade)
  ticketTypeId String
  ticketType   TicketType   @relation(fields: [ticketTypeId], references: [id])
  seatNumber   String?      // Mã ghế cụ thể (nếu có, e.g. A12)
  status       TicketStatus @default(RESERVED) // RESERVED, BOOKED, REFUNDED
  createdAt    DateTime     @default(now())
  updatedAt    DateTime     @updatedAt

  @@map("tickets")
}

enum TicketStatus {
  RESERVED // Khi tạo order pending (khoá tạm thời)
  BOOKED   // Khi order đã thanh toán thành công (PAID)
  REFUNDED // Khi hoàn vé
}
```

### 2. Thiết kế Cơ chế Redis Cache-aside cho Vé còn lại
Để giảm tải cho PostgreSQL khi hàng ngàn người dùng tải trang danh sách/chi tiết concert cùng lúc:
- **Key Pattern**: `ticket_inventory:<ticket_type_id>` lưu giá trị integer là số vé còn lại.
- **Luồng Đọc (Read)**:
  1. Frontend gọi API lấy số vé còn lại.
  2. Backend kiểm tra trên Redis:
     - *Nếu có (Cache Hit)*: Trả về kết quả ngay lập tức.
     - *Nếu không có (Cache Miss)*: Query DB tính số vé đã bán (Tickets có status `RESERVED` hoặc `BOOKED`). Số vé còn lại = `totalQuantity` - `Sold`. Lưu giá trị này vào Redis với **TTL 30 giây**.
- **Luồng Invalidate (Ghi/Huỷ)**:
  - Khi một giao dịch đặt vé mới được tạo hoặc thanh toán thành công, Backend SHALL xóa key `ticket_inventory:<ticket_type_id>` trên Redis. Lần truy cập tiếp theo sẽ tự động load lại dữ liệu mới nhất từ DB.

### 3. Thuật toán kiểm tra Giới hạn mua của Khán giả (Per-user Limit)
Mỗi lần người dùng gửi yêu cầu đặt $K$ vé loại `ticketTypeId`:
1. Backend thực hiện đếm số lượng vé loại `ticketTypeId` mà `userId` đã mua thành công trong DB:
   ```sql
   SELECT COUNT(*) FROM tickets t
   JOIN orders o ON t.orderId = o.id
   WHERE o.userId = :userId 
     AND t.ticketTypeId = :ticketTypeId
     AND o.status = 'PAID'
   ```
2. Nếu `Số_vé_đã_mua + K > ticket_types.maxLimitPerUser`, Backend trả về lỗi và chặn giao dịch.

### 4. Thiết kế Sơ đồ Chỗ ngồi SVG Tương tác ở Frontend
- File sơ đồ chỗ ngồi định dạng `.svg` được thiết kế có cấu trúc nhóm `<g id="vip" class="seat-zone">` tương ứng với mã/tên phân hạng vé.
- Next.js Frontend fetch file SVG từ `seatMapUrl`, render trực tiếp vào DOM (inline SVG).
- Dùng Javascript lắng nghe sự kiện click trên các khu vực SVG có class `.seat-zone` để xác định khu vực được chọn và hiển thị form chọn số lượng tương ứng.

## Risks / Trade-offs

- **[Risk 1: Cache stampede / Thủng cache]** → Khi cache hết hạn và có hàng ngàn request cùng lúc truy cập, hệ thống có thể bị quá tải DB do query dồn dập.
  - *Mitigation*: Sử dụng cơ chế khóa mutex đơn giản trên bộ nhớ node hoặc thiết lập thời gian TTL ngẫu nhiên nhẹ (jitter) để tránh việc nhiều key cùng hết hạn một lúc.
- **[Risk 2: Tranh chấp đặt vé (Race Condition)]** → Nhiều người dùng đặt vé cùng lúc dẫn đến số lượng vé thực tế trong DB bị âm (overselling).
  - *Mitigation*: Sử dụng Prisma transaction cùng khóa bi quan (pessimistic lock hoặc `SELECT ... FOR UPDATE` thông qua `$queryRaw` của Prisma) khi thực hiện trừ kho số lượng vé trong DB.
