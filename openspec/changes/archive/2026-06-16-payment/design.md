## Context

Change `payment` yêu cầu tích hợp các cổng thanh toán trực tuyến MoMo và VNPAY vào quy trình đặt mua vé của khán giả trên hệ thống **TicketBox**. Tính năng này đòi hỏi sự phối hợp chặt chẽ về mặt trạng thái đơn hàng giữa các phân hệ, đảm bảo tính nhất quán dữ liệu, chống thanh toán trùng lặp (Idempotency), và tự bảo vệ hệ thống khi cổng thanh toán đối tác bị lỗi (Circuit Breaker).

Thiết kế kỹ thuật này sử dụng:
- **Backend**: Express.js + Prisma ORM
- **Database**: PostgreSQL 16
- **Cache/Distributed Locks**: Redis 7

## Goals / Non-Goals

**Goals:**
- Thiết kế luồng thay đổi trạng thái đơn hàng theo hai giai đoạn (PENDING/RESERVED ──▶ PAID/BOOKED hoặc CANCELLED).
- Thiết kế mô hình cơ sở dữ liệu lưu trữ giao dịch thanh toán (`Payment`).
- Triển khai cơ chế chống trùng thanh toán (Idempotency Key) bằng Redis.
- Thiết kế Circuit Breaker (Bộ ngắt mạch) để ngắt các kết nối lỗi tới cổng thanh toán MoMo/VNPAY.
- Xây dựng background worker hoặc cron-job tự động hủy đơn hàng và giải phóng ghế quá hạn 10 phút.

**Non-Goals:**
- Tích hợp giao diện quản trị hoàn tiền (Refund Admin UI).
- Xử lý đối soát thủ công (Manual Reconcile) giữa kế toán và ngân hàng.

## Decisions

### 1. Nâng cấp Database Schema (Prisma)
Bổ sung bảng `Payment` và trường `idempotencyKey` trong bảng `Order`:

```prisma
model Order {
  id             String      @id @default(uuid())
  userId         String      @map("user_id")
  concertId      String      @map("concert_id")
  concert        Concert     @relation(fields: [concertId], references: [id])
  totalAmount    Decimal     @db.Decimal(12, 2) @map("total_amount")
  status         OrderStatus @default(PENDING) // PENDING, PAID, CANCELLED
  idempotencyKey String?     @unique @map("idempotency_key") // Lưu key để tra cứu lại
  tickets        Ticket[]
  payments       Payment[]
  createdAt      DateTime    @default(now()) @map("created_at")
  updatedAt      DateTime    @updatedAt @map("updated_at")

  @@map("orders")
}

model Payment {
  id             String        @id @default(uuid())
  orderId        String        @map("order_id")
  order          Order         @relation(fields: [orderId], references: [id], onDelete: Cascade)
  paymentGateway String        @map("payment_gateway") // VNPAY, MOMO
  amount         Decimal       @db.Decimal(12, 2)
  status         PaymentStatus @default(PENDING) // PENDING, SUCCESS, FAILED
  transactionId  String?       @map("transaction_id") // Mã giao dịch của cổng thanh toán
  responseCode   String?       @map("response_code") // Mã phản hồi chi tiết từ đối tác
  createdAt      DateTime      @default(now()) @map("created_at")
  updatedAt      DateTime      @updatedAt @map("updated_at")

  @@map("payments")
}

enum PaymentStatus {
  PENDING
  SUCCESS
  FAILED
}
```

### 2. Luồng Trạng Thái Đặt Vé và Webhook Web/IPN
Chúng ta chuyển từ luồng auto-PAID trước đây sang luồng xử lý bất đồng bộ:

```text
┌─────────────────┐       Tạo đơn        ┌──────────────────┐
│ Khán giả đặt vé │ ───────────────────▶ │ Order: PENDING   │
└─────────────────┘                      │ Tickets: RESERVED│
                                         └──────────────────┘
                                                   │
                                                   │
                                   ┌───────────────┴───────────────┐
                                   ▼ Webhook                       ▼ Timeout 10p
                         ┌───────────────────┐           ┌───────────────────┐
                         │ Order: PAID       │           │ Order: CANCELLED  │
                         │ Tickets: BOOKED   │           │ Tickets: (Xóa)    │
                         │ (Sinh e-ticket)   │           │ Invalidate Redis  │
                         └───────────────────┘           └───────────────────┘
```

1. **Khóa tạm thời (Hold)**: Khi khán giả chọn vé và nhấn đặt, Backend tạo `Order` với trạng thái `PENDING` và `Ticket` với trạng thái `RESERVED` để giữ chỗ. Đồng thời sinh URL thanh toán của đối tác.
2. **Xử lý Webhook (IPN)**:
   - **Thanh toán thành công**: Cập nhật trạng thái `Payment` thành `SUCCESS`, `Order` thành `PAID`, và `Ticket` thành `BOOKED` (Sinh mã e-ticket QR).
   - **Thanh toán thất bại**: Cập nhật `Payment` thành `FAILED`, `Order` thành `CANCELLED`, xóa các record `Ticket` `RESERVED` để giải phóng ghế, hủy cache Redis inventory.
3. **Background Job (Giải phóng vé quá hạn)**:
   - Một Cron Job chạy mỗi 1 phút sẽ truy vấn các `Order` ở trạng thái `PENDING` được tạo trước đó quá 10 phút.
   - Các đơn hàng này sẽ bị chuyển sang `CANCELLED`, các vé `RESERVED` tương ứng sẽ bị xóa khỏi hệ thống để người khác có thể mua, invalidate Redis cache.

### 3. Cơ chế chống trùng lặp bằng Idempotency Key (Redis)
Để đảm bảo an toàn giao dịch, mỗi yêu cầu thanh toán cần gửi kèm header `Idempotency-Key` (UUID sinh bởi Client):
1. **Kiểm tra khóa**: Backend kiểm tra sự tồn tại của key `idempotency:<key>` trên Redis:
   - *Nếu tồn tại và giá trị là `PROCESSING`*: Trả về mã lỗi `409 Conflict` (Giao dịch đang được xử lý).
   - *Nếu tồn tại và giá trị là JSON kết quả*: Trả về kết quả cũ ngay lập tức (không chạy lại logic nghiệp vụ).
2. **Khởi tạo xử lý**: Nếu chưa tồn tại, Backend ghi key với giá trị `PROCESSING` và TTL 120s vào Redis.
3. **Lưu kết quả**: Sau khi xử lý nghiệp vụ thành công, Backend ghi đè kết quả xử lý (JSON String) vào key đó với TTL 24 giờ.

### 4. Triển khai Circuit Breaker cho VNPAY/MoMo
Bảo vệ hệ thống khi một trong hai cổng thanh toán gặp sự cố kéo dài:
- **Trạng thái**: Lưu trên Redis gồm `circuit_breaker:<gateway>:state` (CLOSED, OPEN, HALF-OPEN) và `circuit_breaker:<gateway>:failures`.
- **Ngưỡng kích hoạt**: 5 lần lỗi liên tiếp (Timeout hoặc HTTP 5xx từ API cổng thanh toán).
- **Luồng hoạt động**:
  - Khi số lần failures >= 5: Chuyển trạng thái sang `OPEN`. Đặt TTL 60 giây. Trong thời gian này, mọi yêu cầu thanh toán qua gateway này sẽ bị từ chối ngay lập tức ở mức Filter/Middleware (trả về lỗi "Cổng thanh toán đang bảo trì").
  - Sau 60 giây (hết hạn TTL): Trạng thái chuyển sang `HALF-OPEN`. Cho phép 1 request đi qua test. Nếu thành công, reset failures = 0 và chuyển về `CLOSED`. Nếu thất bại, chuyển về `OPEN` với TTL 120 giây.

## Risks / Trade-offs

- **[Risk 1: Thất lạc Webhook kết quả thanh toán]** → Khán giả đã bị trừ tiền bên ngân hàng nhưng đơn hàng trên hệ thống vẫn ở trạng thái PENDING.
  - *Mitigation*: Thiết kế nút "Kiểm tra thanh toán" trên frontend để kích hoạt một API gọi trực tiếp sang API đối soát của VNPAY/MoMo nhằm đồng bộ thủ công kết quả giao dịch.
- **[Risk 2: Quá tải Redis ảnh hưởng luồng Idempotency]** → Nếu Redis gặp sự cố, luồng thanh toán có thể bị tắc nghẽn.
  - *Mitigation*: Triển khai fallback khi Redis mất kết nối: Hệ thống tự động ghi nhận trực tiếp trên bảng `idempotency_logs` trong database PostgreSQL thay thế tạm thời.
