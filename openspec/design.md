# KIẾN TRÚC TỔNG THỂ & KHẢ NĂNG CÔ LẬP LỖI - TICKETBOX

Tài liệu này trình bày thiết kế kiến trúc phần mềm của hệ thống **TicketBox**, lý do lựa chọn mô hình kiến trúc, cách các thành phần tương tác và cơ chế cô lập lỗi để bảo vệ hệ thống trước các sự cố vận hành thực tế.

---

## 1. Kiến trúc Tổng thể (Overall Architecture)

Hệ thống TicketBox được thiết kế theo mô hình **Modular Monolith (Monolith đơn khối phân rã mô-đun)** đối với Backend, kết hợp với các Frontend được tách biệt hoàn toàn theo vai trò người dùng (Customer Web, Admin Portal, Scanner App).

```
                     +---------------------------------------+
                     |         Khán giả (Audience)           |
                     |  Customer Web App (Next.js 14 client) |
                     +-------------------+-------------------+
                                         | HTTP (JWT)
                                         v
                     +-------------------+-------------------+
                     |           API Gateway / Router        |
                     +-------------------+-------------------+
                                         |
         +-------------------------------+-------------------------------+
         |                               |                               |
         v (Module)                      v (Module)                      v (Module)
+------------------+            +------------------+            +------------------+
|  auth & rbac     |            |  concert         |            |  order & ticket  |
+------------------+            +------------------+            +------------------+
|  payment         |            |  checkin         |            |  vip-guest-sync  |
+------------------+            +------------------+            +------------------+
|  ai (Artist Bio) |            |  notification    |            |  admin           |
+------------------+            +------------------+            +------------------+
         |                               |                               |
         +-------------------------------+-------------------------------+
                                         |
                                         v
            +----------------------------+----------------------------+
            |                                                         |
            v                                                         v
   +--------+--------+                                       +--------+--------+
   |   PostgreSQL    |                                       |      Redis      |
   | (Transactional) |                                       | (Cache / Queue) |
   +-----------------+                                       +-----------------+
            ^                                                         ^
            |                                                         |
            +----------------------------+----------------------------+
                                         |
                                         v
                           +-------------+-------------+
                           |    Background Workers     |
                           |  (Expiration, AI, CSV...) |
                           +---------------------------+
```

### Các thành phần chính trong hệ thống:
1.  **Client-side (Ứng dụng phía máy khách):**
    *   **Customer Frontend (Next.js 14 App Router):** Phục vụ khán giả tìm kiếm concert, xem chi tiết và tiến hành luồng đặt vé, thanh toán trực tuyến.
    *   **Admin Frontend (Next.js):** Dành cho Ban tổ chức quản lý cấu hình vé, xem báo cáo doanh thu, duyệt tiểu sử nghệ sĩ do AI sinh và cấu hình nhãn hàng tài trợ.
    *   **Scanner Mobile App (Android Native Kotlin):** Ứng dụng di động chuyên dụng cho nhân viên soát vé tại các cổng kiểm soát, hỗ trợ quét camera QR ngoại tuyến và đồng bộ.
2.  **Backend Services (Express.js):** 
    Cấu trúc mã nguồn theo hướng **Modular Monolith** phân tách rõ ràng thành các mô-đun độc lập trong thư mục [backend/src/modules](file:///n:/DESIGN%20SYSTEM/DOAN/Ticket-Box-/backend/src/modules):
    *   `auth`: Quản lý tài khoản, JWT, cấp phát/thu hồi Refresh Token.
    *   `rbac`: Quản lý phân quyền Role-based Access Control.
    *   `concert`: Quản lý thông tin concert, sơ đồ khu vực SVG, cache concert tĩnh.
    *   `ticket` & `order`: Quản lý luồng đặt vé, khóa giữ chỗ tạm thời (Redis), kiểm tra per-user limit, chống bán lố vé.
    *   `payment`: Tích hợp sandbox MoMo/VNPAY, áp dụng Circuit Breaker cô lập lỗi và kiểm tra Idempotency chống trừ tiền trùng.
    *   `checkin`: Soát vé online/offline, đồng bộ dữ liệu checkin log, xuất dữ liệu checkin realtime.
    *   `vip-guest-sync`: Đồng bộ khách mời tài trợ thông qua quét mailbox IMAP và parse file CSV tự động.
    *   `ai`: Upload PDF, trích xuất text và gửi Gemini API để tạo Artist Bio.
3.  **Data Storage & Messaging (Lưu trữ dữ liệu & Truyền tin):**
    *   **PostgreSQL (ORM Prisma):** Lưu trữ dữ liệu có tính toàn vẹn cao (giao dịch thanh toán, thông tin vé, cấu hình concert, tài khoản người dùng).
    *   **Redis:** Đóng vai trò là bộ nhớ đệm (Cache danh sách concert), cơ chế khóa giữ vé tạm thời (TTL 10 phút), Rate Limiting counter, và lưu trữ thông tin phòng chờ (Sorted Set).
    *   **RabbitMQ:** Message Broker xử lý bất đồng bộ các sự kiện giữa các module (như thông báo `PaymentCompleted` để sinh vé và kích hoạt queue gửi email).
    *   **MinIO (S3-compatible):** Lưu trữ file PDF hồ sơ gốc nghệ sĩ, file ảnh QR E-Ticket và file CSV danh sách khách VIP gốc.

---

## 2. Lý do chọn Kiến trúc Modular Monolith

Mô hình **Modular Monolith** được lựa chọn thay vì Microservices dựa trên các lập luận kiến trúc và bối cảnh vận hành sau:

1.  **Duy trì tính nhất quán dữ liệu (Data Consistency):**
    Nghiệp vụ đặt vé concert đòi hỏi tính nhất quán giao dịch cực kỳ cao khi kiểm tra số lượng vé khả dụng còn lại để tránh bán lố (Overselling). Với Modular Monolith, hệ thống có thể thực hiện giao dịch ACID trực tiếp trên database PostgreSQL bằng cách khóa bi quan (`SELECT ... FOR UPDATE` trong transaction) trên các bảng `TicketInventory` và `TicketType`. Nếu chuyển sang Microservices, việc đảm bảo tính nhất quán trên hai DB khác nhau (Order DB và Inventory DB) yêu cầu các cơ chế giao dịch phân tán phức tạp (Saga Pattern, 2-Phase Commit) làm tăng đáng kể độ trễ (latency) và khả năng thất bại của giao dịch dưới tải cao.
2.  **Đơn giản hóa việc triển khai và vận hành (Deployment & Operations):**
    Đối với các đội ngũ phát triển quy mô vừa và nhỏ, việc vận hành hàng chục microservices đòi hỏi hạ tầng Kubernetes, CI/CD phức tạp và chi phí giám sát cao. Modular Monolith cho phép đóng gói toàn bộ backend thành một Docker container duy nhất, triển khai dễ dàng nhưng vẫn duy trì cấu trúc mã nguồn tách biệt, dễ bảo trì.
3.  **Giảm thiểu độ trễ mạng (Network Latency):**
    Trong luồng đặt vé cao tải, việc giao tiếp nội bộ giữa các dịch vụ thông qua gọi hàm (In-memory calls) có tốc độ nhanh hơn rất nhiều so với việc gọi API HTTP/gRPC qua mạng giữa các microservices độc lập, giúp tối ưu hóa thời gian giữ vé tạm thời và giảm tỷ lệ timeout của client.
4.  **Khả năng nâng cấp linh hoạt (Future Microservice Extraction):**
    Bằng việc tuân thủ quy tắc nghiêm ngặt: **Mô-đun này không được import trực tiếp vào file nội bộ của mô-đun khác** mà phải giao tiếp qua Interface, Event (RabbitMQ) hoặc Shared Library, hệ thống có thể dễ dàng tách bất kỳ mô-đun nào (ví dụ dịch vụ Thanh toán hoặc soát vé) thành một microservice độc lập khi quy mô hệ thống tăng lên mà không cần viết lại toàn bộ mã nguồn.

---

## 3. Khả năng Cô lập Lỗi (Error Isolation & Resilience)

Kiến trúc TicketBox được thiết kế với tư duy **Design for Failure (Thiết kế chịu lỗi)**, đảm bảo sự cố tại một thành phần không làm sập toàn bộ hệ thống (Cascading Failure).

```
+---------------------------------------------------------------------------------+
|                                 RANH GIỚI CHỊU LỖI                              |
|                                                                                 |
|  [Dịch vụ AI Bio Lỗi / Gemini API Down]                                          |
|         |-- Không ảnh hưởng --> [Khán giả tìm kiếm và mua vé vẫn hoạt động]       |
|                                                                                 |
|  [Cổng Thanh toán MoMo / VNPAY Lỗi liên tiếp]                                   |
|         |-- Kích hoạt Circuit Breaker --> [Báo cổng bảo trì - Các luồng khác OK] |
|                                                                                 |
|  [Database PostgreSQL quá tải]                                                  |
|         |-- Phục vụ từ Cache --> [Trang chủ / Danh sách Concert vẫn đọc được]     |
|                                                                                 |
|  [Hàng đợi Email/Thông báo bị nghẽn]                                            |
|         |-- Tách biệt Queue/Worker --> [Không ảnh hưởng luồng soát vé tại cổng]  |
+---------------------------------------------------------------------------------+
```

### Các cơ chế cô lập lỗi cụ thể:

1.  **Cô lập tích hợp cổng thanh toán (Circuit Breaker):**
    *   *Sự cố:* API của đối tác MoMo hoặc VNPAY bị chậm hoặc mất kết nối hoàn toàn.
    *   *Giải pháp:* Dịch vụ thanh toán sử dụng cơ chế Circuit Breaker. Khi phát hiện số lần kết nối thất bại vượt quá ngưỡng thiết lập (5 lần liên tiếp), mạch chuyển sang trạng thái **OPEN**.
    *   *Hiệu quả cô lập:* Toàn bộ yêu cầu thanh toán qua cổng lỗi sẽ bị từ chối nhanh (fail-fast), hệ thống trả về lỗi "Cổng thanh toán đang bảo trì" để người dùng chọn phương thức thanh toán khác hoặc thử lại sau. Điều này ngăn chặn việc các kết nối chờ (pending connection) làm cạn kiệt tài nguyên máy chủ (thread pool/memory socket), giữ cho luồng xem concert và đăng nhập hoạt động bình thường.
2.  **Cô lập xử lý AI (Gemini API & Worker):**
    *   *Sự cố:* Gemini API của Google bị chặn giới hạn (Rate Limit) hoặc file PDF bị lỗi không thể parse văn bản.
    *   *Giải pháp:* Toàn bộ quy trình sinh bio nghệ sĩ được thực hiện bất đồng bộ thông qua [ai-bio.worker.ts](file:///n:/DESIGN%20SYSTEM/DOAN/Ticket-Box-/backend/src/workers/ai-bio.worker.ts) tách biệt khỏi luồng HTTP xử lý request của Client.
    *   *Hiệu quả cô lập:* Khi tiến trình worker lỗi, nó chỉ cập nhật trạng thái bản ghi bio sang `FAILED` kèm thông tin lỗi mà không gây ảnh hưởng đến luồng đặt vé hay soát vé của người dùng. Ban tổ chức vẫn có thể upload lại hoặc biên tập bio nghệ sĩ thủ công.
3.  **Cô lập Cơ sở dữ liệu bằng Redis Caching:**
    *   *Sự cố:* Database PostgreSQL bị tải cao do hàng nghìn request đổ vào trang danh sách concert cùng lúc.
    *   *Giải pháp:* Hệ thống sử dụng chiến lược **Cache-aside** trên Redis cho các API công khai của danh sách concert.
    *   *Hiệu quả cô lập:* Đa số request đọc sẽ hit vào cache Redis. Ngay cả khi PostgreSQL gặp sự cố tạm thời hoặc phản hồi chậm, khách hàng vẫn có thể truy cập trang chủ và xem danh sách concert mượt mà từ Redis cache.
4.  **Cô lập dịch vụ gửi thông báo:**
    *   *Sự cố:* Hàng đợi gửi email vé điện tử bị nghẽn (ví dụ: máy chủ SMTP từ chối kết nối).
    *   *Giải pháp:* Tác vụ gửi email được tách thành queue riêng xử lý qua background worker.
    *   *Hiệu quả cô lập:* Việc email gửi chậm không ảnh hưởng đến giao dịch thanh toán thành công hay trạng thái vé trên DB. Khán giả vẫn sở hữu vé hợp lệ và có thể quét QR trực tiếp từ giao diện "Vé của tôi" trên Web App, trong khi worker email tự động thực hiện cơ chế retry để gửi mail sau.
