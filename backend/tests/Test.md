# Hướng Dẫn Kịch Bản Kiểm Thử (Tests Documentation)

Tài liệu này tổng hợp toàn bộ các kịch bản kiểm thử (Integration, Concurrency, Load Tests) có trong thư mục [backend/tests](file:///n:/DESIGN%20SYSTEM/DOAN/Ticket-Box-/backend/tests).

---

## 🚀 Cách Chạy Test Chung
Tất cả lệnh chạy test đều được thực thi tại thư mục gốc của backend (`backend/`). Hãy chắc chắn rằng bạn đã khởi động cơ sở dữ liệu PostgreSQL và Redis trước khi chạy test.

```bash
# Di chuyển vào thư mục backend
cd backend

# Chạy kịch bản cụ thể bằng npm run <tên-script>
# Ví dụ:
npm run test:concurrency
```

---

## 📋 Chi Tiết Các Kịch Bản Kiểm Thử

### 1. [concurrency-test.ts](file:///n:/DESIGN%20SYSTEM/DOAN/Ticket-Box-/backend/tests/concurrency-test.ts)
* **Lệnh chạy**: `npm run test:concurrency`
* **Kiểm thử yêu cầu**: **IM11 (Anti-Overselling / Chống bán lố vé cuối cùng)**
* **Kịch bản kiểm thử**:
  1. Tạo 1 concert thử nghiệm và loại vé có tồn kho thực tế chỉ đúng **1 vé**.
  2. Tạo **100 tài khoản Audience giả lập**.
  3. Gửi đồng thời **100 yêu cầu đặt giữ vé** (sử dụng `Promise.allSettled`).
* **Kết quả mong đợi**:
  * Chỉ đúng **1 request** thành công.
  * 99 request còn lại thất bại và nhận mã lỗi hoặc thông tin báo hết vé (`TICKET_SOLD_OUT`).
  * Trạng thái tồn kho trong DB không bị âm (`availableQuantity = 0`, `reservedQuantity = 1`).

---

### 2. [user-limit-test.ts](file:///n:/DESIGN%20SYSTEM/DOAN/Ticket-Box-/backend/tests/user-limit-test.ts)
* **Lệnh chạy**: `npm run test:user-limit`
* **Kiểm thử yêu cầu**: **IM03 (Giới hạn số lượng vé cá nhân - Tuần tự)**
* **Kịch bản kiểm thử**:
  1. Tạo concert và loại vé có giới hạn mua tối đa của mỗi tài khoản là `maxPerAccount = 2`.
  2. Tạo 1 user giả lập và gửi lần lượt 3 yêu cầu giữ vé (mỗi lần mua 1 vé):
     * Giao dịch 1: Mua 1 vé.
     * Giao dịch 2: Mua 1 vé.
     * Giao dịch 3: Cố tình mua thêm 1 vé.
* **Kết quả mong đợi**:
  * Lần 1 và lần 2 thành công.
  * Lần 3 bị chặn đứng và trả về mã lỗi `USER_TICKET_LIMIT_EXCEEDED`.

---

### 3. [user-limit-concurrency-test.ts](file:///n:/DESIGN%20SYSTEM/DOAN/Ticket-Box-/backend/tests/user-limit-concurrency-test.ts)
* **Lệnh chạy**: `npm run test:user-limit-concurrency`
* **Kiểm thử yêu cầu**: **IM03 (Giới hạn số lượng vé cá nhân - Request đồng thời)**
* **Kịch bản kiểm thử**:
  1. Thiết lập loại vé giới hạn `maxPerAccount = 2`.
  2. Tạo 1 user giả lập và gửi đồng thời **5 yêu cầu giữ vé** (mỗi yêu cầu mua 1 vé) bằng `Promise.allSettled`.
* **Kết quả mong đợi**:
  * Nhờ cơ chế khóa bi quan `FOR UPDATE` trên dòng tồn kho, các transaction được xử lý tuần tự.
  * Đúng **2 request** thành công.
  * 3 request còn lại thất bại với lỗi `USER_TICKET_LIMIT_EXCEEDED`.

---

### 4. [rate-limit-test.ts](file:///n:/DESIGN%20SYSTEM/DOAN/Ticket-Box-/backend/tests/rate-limit-test.ts)
* **Lệnh chạy**: `npm run test:rate-limit`
* **Kiểm thử yêu cầu**: **IM12 (Rate Limiting / Chống spam request)**
* **Kịch bản kiểm thử**:
  1. Tạm thời cấu hình mốc giới hạn rate limit ở mức cực thấp để kiểm thử: `2 requests / 10 giây`.
  2. Gửi liên tiếp **4 requests** giữ vé từ cùng một tài khoản trong thời gian dưới 1 giây.
* **Kết quả mong đợi**:
  * 2 request đầu tiên vượt qua middleware thành công.
  * 2 request tiếp theo bị chặn đứng ngay lập tức tại middleware với mã lỗi HTTP **429 (Too Many Requests)**.

---

### 5. [idempotency-test.ts](file:///n:/DESIGN%20SYSTEM/DOAN/Ticket-Box-/backend/tests/idempotency-test.ts)
* **Lệnh chạy**: `npm run test:idempotency`
* **Kiểm thử yêu cầu**: **IM14 (Idempotency Key / Chống giao dịch thanh toán trùng lặp)**
* **Kịch bản kiểm thử**:
  * **Kịch bản Đồng thời (Concurrent)**: Gửi 2 request thanh toán cùng lúc với chung 1 `Idempotency-Key` (bằng `Promise.all`).
  * **Kịch bản Tuần tự (Sequential)**: Gửi request thanh toán lần 1 thành công (kết quả lưu cache Redis). Sau đó gửi lại chính xác request đó lần 2 với cùng key.
* **Kết quả mong đợi**:
  * *Với kịch bản đồng thời*: 1 request xử lý thành công (201) và 1 request bị chặn ngay tại middleware với lỗi **HTTP 409 (`IDEMPOTENCY_CONFLICT`)**.
  * *Với kịch bản tuần tự*: Lần 2 tự động lấy kết quả cũ từ Redis cache trả về trực tiếp (HTTP 201, chung `Payment ID`) mà không tạo thêm bản ghi thanh toán mới trong DB.

---

### 6. [circuit-breaker-test.ts](file:///n:/DESIGN%20SYSTEM/DOAN/Ticket-Box-/backend/tests/circuit-breaker-test.ts)
* **Lệnh chạy**: `npm run test:circuit-breaker`
* **Kiểm thử yêu cầu**: **IM13 (Circuit Breaker & Graceful Degradation / Cô lập lỗi thanh toán)**
* **Kịch bản kiểm thử**:
  1. Gọi API xem danh sách concert để kiểm tra trạng thái hoạt động bình thường.
  2. Giả lập cổng thanh toán VNPAY bị lỗi liên tiếp **5 lần** bằng cách gọi hàm `recordFailure` trực tiếp lên Redis.
  3. Kiểm tra gọi API tạo thanh toán mới để xác nhận Circuit Breaker đã tự động ngắt mạch (**OPEN**).
  4. Tiếp tục gọi API danh sách concert để kiểm chứng tính năng cô lập lỗi (Graceful Degradation).
* **Kết quả mong đợi**:
  * Trang xem concert vẫn trả về **HTTP 200** hoạt động bình thường trước và sau khi cổng thanh toán gặp lỗi.
  * API tạo thanh toán sau khi lỗi liên tiếp bị chặn ngay lập tức với lỗi **HTTP 503 (`PAYMENT_GATEWAY_MAINTENANCE`)**.

---

### 7. [waiting-room-80k-test.ts](file:///n:/DESIGN%20SYSTEM/DOAN/Ticket-Box-/backend/tests/waiting-room-80k-test.ts)
* **Lệnh chạy**: `npm run test:waiting-room-80k`
* **Kiểm thử yêu cầu**: **Bot-Fairness & Virtual Waiting Room (Phòng chờ chịu tải lớn)**
* **Kịch bản kiểm thử**:
  1. Bật Waiting Room cho Concert.
  2. Sử dụng Redis Pipelining để đẩy nhanh **80.000 user sessions** xếp hàng vào Redis Sorted Set (`ZSET`).
  3. Truy vấn vị trí (Rank) của người thứ 80.000.
  4. Thực hiện chu kỳ giải phóng (Release) 500 người đầu tiên vào mua vé và kiểm tra trạng thái của các user.
* **Kết quả mong đợi**:
  * Đẩy thành công 80.000 user vào queue trong thời gian ngắn (< 1 giây).
  * Vị trí người thứ 80.000 được tính toán chính xác là 80.000.
  * Trạng thái các user được giải phóng chuyển sang `READY` và các user kế tiếp đẩy lên đúng thứ tự.

---

### 8. [waiting-room-80k-plus-1-test.ts](file:///n:/DESIGN%20SYSTEM/DOAN/Ticket-Box-/backend/tests/waiting-room-80k-plus-1-test.ts)
* **Lệnh chạy**: `npm run test:waiting-room-80k-plus-1`
* **Kiểm thử yêu cầu**: **Virtual Waiting Room (Kiểm tra thứ tự người thứ 80.001)**
* **Kịch bản kiểm thử**:
  1. Nạp trước **80.000 user sessions** xếp hàng trong quá khứ.
  2. Giả lập người thứ 80.001 (`user-special-80001`) gia nhập hàng chờ thông qua API `join()`.
  3. Truy vấn kiểm tra vị trí hiện tại của user này trong hàng đợi.
* **Kết quả mong đợi**:
  * Tổng số lượng hàng chờ (ZCard) tăng lên 80.001.
  * Vị trí (Position) của `user-special-80001` trả về đúng bằng **80.001** (đứng ở cuối hàng).

---

### 9. [waiting-room-800k-test.ts](file:///n:/DESIGN%20SYSTEM/DOAN/Ticket-Box-/backend/tests/waiting-room-800k-test.ts)
* **Lệnh chạy**: `npm run test:waiting-room-800k`
* **Kiểm thử yêu cầu**: **Virtual Waiting Room (Tải cực hạn 800.000 user)**
* **Kịch bản kiểm thử**:
  1. Sử dụng Redis Pipelining chia theo block 25.000 nạp nhanh **800.000 user sessions** vào hàng đợi.
  2. Người thứ 800.001 (`user-special-80001`) thực hiện gia nhập hàng chờ.
  3. Kiểm tra tổng số lượng queue và vị trí xếp hàng của user đặc biệt này.
* **Kết quả mong đợi**:
  * Hệ thống chịu tải mượt mà, nạp xong 800.000 user trong vài giây.
  * Tổng số lượng queue là 800.001 và vị trí của user đặc biệt là **800.001**.

---

### 10. [payment-qr-test.ts](file:///n:/DESIGN%20SYSTEM/DOAN/Ticket-Box-/backend/tests/payment-qr-test.ts)
* **Lệnh chạy**: `npm run test:payment-qr`
* **Kiểm thử yêu cầu**: **IM02 (QR Code soát vé) & IM05 (Quy trình thanh toán)**
* **Kịch bản kiểm thử**:
  1. Tạo đơn hàng và lấy link thanh toán.
  2. Giả lập cổng thanh toán gọi lại qua Webhook IPN báo thanh toán thành công đơn hàng.
  3. Kiểm tra xem hệ thống có tự sinh mã vé, mã QR Code e-ticket và đẩy sự kiện gửi email có đính kèm ảnh QR Code soát vé hay không.
* **Kết quả mong đợi**:
  * Đơn hàng chuyển sang trạng thái `PAID`.
  * Các vé (`Ticket`) tương ứng được tạo lập trong DB kèm mã Code mã hóa.
  * Tải/sinh thành công ảnh QR Code chứa Token soát vé.

---

### 11. [reminder-test.ts](file:///n:/DESIGN%20SYSTEM/DOAN/Ticket-Box-/backend/tests/reminder-test.ts)
* **Lệnh chạy**: `npm run test:reminder`
* **Kiểm thử yêu cầu**: **IM04 (Scheduler / Gửi email nhắc nhở trước 24h sự kiện)**
* **Kịch bản kiểm thử**:
  1. Tạo concert có mốc thời gian bắt đầu nằm trong vòng 24 giờ tiếp theo.
  2. Có các đơn hàng đã thanh toán (`PAID`) tương ứng.
  3. Kích hoạt bộ lập lịch (Cron Job) quét DB tìm sự kiện gần diễn ra.
* **Kết quả mong đợi**:
  * Hệ thống tìm đúng các đơn hàng thuộc concert chuẩn bị diễn ra.
  * Tác vụ gửi thông báo nhắc nhở kèm thông tin chi tiết được đẩy vào hàng chờ RabbitMQ (`ticketbox_notifications`) để xử lý ngầm.

---

### 12. [autocannon-load-test.ts](file:///n:/DESIGN%20SYSTEM/DOAN/Ticket-Box-/backend/tests/autocannon-load-test.ts)
* **Lệnh chạy**: `npm run test:autocannon`
* **Kiểm thử yêu cầu**: **IM11 (Kiểm thử tải & Tính toàn vẹn tồn kho)**
* **Kịch bản kiểm thử**:
  1. Tạo concert có tồn kho chính xác **100 vé**.
  2. Tạo 10 users giả lập với tokens JWT.
  3. Chuẩn bị **200 request đặt giữ vé** khác nhau (mỗi request 1 vé) kèm Idempotency-Key ngẫu nhiên.
  4. Sử dụng công cụ `autocannon` để đẩy đồng thời 200 request này lên API thông qua 10 connections song song.
* **Kết quả mong đợi**:
  * Hệ thống xử lý mượt mà toàn bộ các request.
  * PostgreSQL Lock hoạt động hoàn hảo: Đúng **100 request** thành công và trừ kho vé về đúng 0, **100 request còn lại** thất bại và báo lỗi hết vé, hoàn toàn không xảy ra tình trạng bán lố (Overselling).
