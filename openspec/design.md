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

---

## High-Level Architecture Diagram (Tích hợp & Ngoại tuyến)

Phần này trình bày sơ đồ luồng dữ liệu (Data Flow) tổng quan của hệ thống và các trình tự xử lý (Sequence Diagrams) cho hai luồng nghiệp vụ đặc thù: tích hợp thanh toán (có ranh giới chịu lỗi) và soát vé ngoại tuyến.

### A. Sơ đồ luồng dữ liệu tổng quát (Data Flow Diagram)

Sơ đồ mô tả các điểm tương tác của Client, Module Backend, các hệ thống bên ngoài (VNPAY/MoMo, Gemini API, Mailbox) và các tầng lưu trữ, xử lý nền:

```mermaid
graph TB
    subgraph Client-side
        Customer[Customer Web App]
        Admin[Admin Dashboard]
        Scanner[Scanner Android App]
    end

    subgraph API-Gateway
        Router[Express.js router]
    end

    subgraph Modular-Monolith-Backend
        direction TB
        AuthMod[Auth & RBAC Module]
        ConcertMod[Concert Module]
        OrderMod[Order & Ticket Module]
        PayMod[Payment Module]
        CheckinMod[Checkin Module]
        VipMod[VIP Guest Sync Module]
        AIMod[AI Bio Module]
    end

    subgraph External-Services
        VNPAY[VNPAY Gateway Sandbox]
        MoMo[MoMo Gateway Sandbox]
        Gemini[Google Gemini API]
        Mailbox[IMAP Mail Server]
    end

    subgraph Data-Stores
        Postgres[(PostgreSQL Main DB)]
        Redis[(Redis Cache & Queue)]
        MinIO[(MinIO S3 Storage)]
    end

    subgraph Async-Workers
        ExpirationWorker[Expiration Worker]
        AIWorker[AI Bio Worker]
        CSVWorker[CSV Import Worker]
        EmailWorker[Email Worker]
    end

    %% Client calls
    Customer -->|HTTP/REST| Router
    Admin -->|HTTP/REST| Router
    Scanner -->|HTTP/REST / Online Scan| Router
    Scanner -.->|Offline Scan Storage| Scanner

    %% Routing
    Router --> AuthMod
    Router --> ConcertMod
    Router --> OrderMod
    Router --> PayMod
    Router --> CheckinMod
    Router --> VipMod
    Router --> AIMod

    %% Integrations & Failure Boundaries
    PayMod ===|Failure Boundary: Circuit Breaker| VNPAY
    PayMod ===|Failure Boundary: Circuit Breaker| MoMo
    AIWorker ===|Failure Boundary: API Exception Handling| Gemini
    CSVWorker ===|Failure Boundary: Connection Recovery| Mailbox

    %% Internal Data Reads/Writes
    OrderMod -->|Lock/Read/Write| Postgres
    OrderMod -->|Cache TTL / Token Check| Redis
    CheckinMod -->|Sync Scan Logs| Postgres

    %% Queuing & Workers
    OrderMod -->|Delay Queue| ExpirationWorker
    AIMod -->|PDF Upload| MinIO
    AIMod -->|Job Queue| AIWorker
    VipMod -->|CSV Download| MinIO
    VipMod -->|CSV Job Queue| CSVWorker
    PayMod -->|Event Publisher| EmailWorker
    CSVWorker -->|Event Publisher| EmailWorker

    %% Persistence
    ExpirationWorker --> Postgres
    AIWorker --> Postgres
    CSVWorker --> Postgres
    EmailWorker --> Postgres
```

---

### B. Trình tự thanh toán & Ranh giới chịu lỗi (Payment Sequence with Failure Boundary)

Khi gọi API thanh toán của đối tác MoMo hoặc VNPAY, hệ thống bọc hàm gọi qua một Circuit Breaker để cô lập lỗi nhanh nếu đối tác gặp sự cố sập hoặc nghẽn mạng:

```mermaid
sequenceDiagram
    autonumber
    actor User as Khán giả (Client)
    participant Server as Backend Express
    participant Redis as Redis Cache
    participant VNPAY as VNPAY Cổng thanh toán
    participant DB as PostgreSQL

    User->>Server: Click Đặt vé (Xác nhận đơn hàng)
    Note over Server: Kiểm tra Circuit Breaker trạng thái [BP11]
    alt Circuit Breaker is OPEN (Đang ngắt mạch do đối tác lỗi liên tiếp)
        Server-->>User: Báo lỗi: Cổng thanh toán bảo trì (Graceful Degradation)
    else Circuit Breaker is CLOSED (Trạng thái hoạt động bình thường)
        Server->>Redis: Atomic Decrement Quantity (Redis DECRBY) [IM11]
        alt Vé đã hết (Quantity less than 0)
            Server-->>User: Trả về lỗi: Loại vé này đã hết chỗ!
        else Vé còn khả dụng (Quantity >= 0)
            Server->>DB: Create Order (PENDING) & Set Hold
            Server->>Redis: Set order hold TTL (10 phút)
            Server->>VNPAY: Gọi API khởi tạo giao dịch (Idempotency Key) [BP12]
            alt API VNPAY lỗi liên tiếp >= Ngưỡng cấu hình
                Note over Server: Kích hoạt ngắt mạch -> CB chuyển sang OPEN
                Server->>Redis: Khôi phục số lượng vé (Redis INCRBY)
                Server-->>User: Trả về lỗi kết nối nhanh (Fail-fast)
            else Kết nối VNPAY thành công
                VNPAY-->>Server: Trả về Payment URL
                Server-->>User: Chuyển hướng trình duyệt sang VNPAY
                User->>VNPAY: Thực hiện thanh toán trên Sandbox
                VNPAY->>Server: Webhook / IPN thông báo thanh toán thành công
                Note over Server: Kiểm tra chữ ký và đối chiếu Idempotency Key
                alt Request trùng lặp (Key đã tồn tại)
                    Server-->>VNPAY: Trả về trạng thái IPN OK lập tức (Không xử lý lại)
                else Request hợp lệ lần đầu
                    Server->>DB: Cập nhật Order (PAID) & Ticket (BOOKED)
                    Server-->>VNPAY: Phản hồi Webhook thành công (IPN OK)
                end
            end
        end
    end
```

---

### C. Trình tự soát vé ngoại tuyến & Đồng bộ (Offline Scanner Sequence)

Sơ đồ mô tả quy trình soát vé tại sân vận động khi không có sóng mạng, lưu log tạm tại bộ nhớ SQLite/SharedPreferences của Android App và thực hiện đồng bộ gom lô (Batch Sync) khi có mạng trở lại:

```mermaid
sequenceDiagram
    autonumber
    actor Guest as Khách tham quan
    actor Staff as Nhân viên soát vé
    participant App as Scanner Android App
    participant Local as Local Storage (SharedPreferences)
    participant Server as Backend Server
    participant DB as PostgreSQL

    Note over App: Thiết bị mất kết nối mạng (Offline)
    Guest->>Staff: Trình QR Code E-ticket
    Staff->>App: Quét mã QR bằng Camera (hoặc gõ token thủ công)
    App->>Local: Lưu log quét (ticketId, scannedAtLocal, gateId, staffId)
    Note over Local: Trạng thái log: PENDING
    App-->>Staff: Báo hiệu quét tạm tính thành công (Yellow)

    Note over App: Thiết bị có kết nối mạng trở lại
    Staff->>App: Click nút "Đồng bộ lượt offline"
    App->>Server: POST /api/v1/checkins/sync (gửi mảng logs)
    Note over Server: Server sắp xếp logs tăng dần theo scannedAtLocal
    loop Với từng log trong mảng
        Server->>DB: Gọi checkin service để kiểm tra & cập nhật trạng thái
        alt Vé hợp lệ & Chưa checkin
            Server->>DB: Cập nhật Ticket = used, ghi CheckinLog (synced = true)
            Note over Server: Kết quả: VALID
        else Vé đã checkin trước đó (Online hoặc log trước)
            Note over Server: Kết quả: ALREADY_USED (Conflict)
        end
    end
    Server-->>App: Trả về kết quả đồng bộ (syncedCount, conflictCount, conflicts)
    App->>Local: Cập nhật trạng thái logs thành SYNCED hoặc CONFLICT
    App-->>Staff: Hiển thị báo cáo kết quả đồng bộ
```

---

## Thiết kế Cơ sở dữ liệu 

Hệ thống sử dụng chiến lược **Polyglot Persistence (Lưu trữ đa chủng loại)** để kết hợp thế mạnh của cơ sở dữ liệu quan hệ (SQL) và cơ sở dữ liệu lưu trữ trên RAM (NoSQL), đảm bảo tính toàn vẹn tài chính và hiệu năng phản hồi dưới tải cao.

### A. Lựa chọn loại Database và Lý do

1.  **Cơ sở dữ liệu chính: PostgreSQL (SQL Relational DB)**
    *   *Các phân hệ áp dụng:* Quản lý người dùng, concert, cấu hình giá vé, đơn hàng, thanh toán, e-ticket và logs check-in.
    *   *Lý do lựa chọn:* 
        *   **Tính tuân thủ ACID chặt chẽ:** Đơn hàng và thanh toán là dữ liệu tài chính, đòi hỏi tính toàn vẹn tuyệt đối. PostgreSQL hỗ trợ các giao dịch (Transactions) mạnh mẽ và khóa dữ liệu (Row-level Locking) để loại bỏ hoàn toàn các lỗi như ghi đè hoặc thất thoát dữ liệu.
        *   **Mối quan hệ chặt chẽ:** Dữ liệu có cấu trúc quan hệ cao (ví dụ: một Đơn hàng chứa nhiều Vé hạng VIP thuộc một Concert được tổ chức bởi một Organizer). Truy vấn SQL giúp thực hiện các phép kết hợp (JOIN) hiệu quả và thiết lập khóa ngoại (Foreign Keys) để duy trì tính nhất quán dữ liệu ở tầng lưu trữ.
2.  **Cơ sở dữ liệu đệm & Khóa: Redis (NoSQL Key-Value/In-Memory)**
    *   *Các phân hệ áp dụng:* Rate Limiting counter, Hàng đợi phòng chờ (Waiting Room), Khóa giữ vé tạm thời (Ticket Hold), Cache danh sách concert tĩnh.
    *   *Lý do lựa chọn:*
        *   **Tốc độ đáp ứng cực cao:** Dữ liệu giữ vé tạm thời thay đổi liên tục và có thời gian sống ngắn (TTL 10 phút). Ghi trực tiếp các thao tác này vào PostgreSQL dưới tải 80.000 user/5 phút sẽ làm sập DB. Redis lưu trữ hoàn toàn trên RAM giúp xử lý hàng chục nghìn thao tác đọc/ghi trong 1 giây với độ trễ < 1ms.
        *   **Tính nguyên tử (Atomicity):** Hỗ trợ các lệnh nguyên tử như `DECRBY` / `INCRBY` để trừ tồn kho vé tức thời và an toàn mà không cần khóa bảng dữ liệu vật lý.
3.  **Lưu trữ đối tượng: MinIO / AWS S3 (Object Storage)**
    *   *Các phân hệ áp dụng:* File SVG sơ đồ ghế ngồi, file PDF hồ sơ nghệ sĩ, file CSV danh sách khách VIP nhãn hàng tài trợ.
    *   *Lý do lựa chọn:* Giảm tải lưu trữ file nhị phân lớn cho PostgreSQL, giúp cơ sở dữ liệu gọn nhẹ và tối ưu hóa việc sao lưu (Backup) cũng như khôi phục (Restore).

---

### B. Thiết kế Schema cho các Entity quan trọng

Dưới đây là thiết kế chi tiết thực thể (Schema) của các bảng chính trong hệ thống (ánh xạ trực tiếp từ file Prisma Schema [schema.prisma](file:///n:/DESIGN%20SYSTEM/DOAN/Ticket-Box-/backend/prisma/schema.prisma)):

```mermaid
erDiagram
    User ||--o{ Order : "creates"
    User ||--o{ Ticket : "owns"
    User ||--o{ CheckinLog : "scans"
    Concert ||--o{ TicketType : "defines"
    Concert ||--o{ Order : "has"
    TicketType ||--|| TicketInventory : "monitors"
    Order ||--|{ OrderItem : "contains"
    OrderItem ||--o{ Ticket : "generates"
    Ticket ||--o{ CheckinLog : "logged"
    
    User {
        uuid id PK
        string email UK
        string passwordHash
        string fullName
        string phone
        string role "ADMIN | ORGANIZER | CHECKIN_STAFF | AUDIENCE"
        datetime createdAt
    }
    
    Concert {
        uuid id PK
        uuid organizerId FK
        string name
        string venue
        datetime startAt
        datetime saleOpenAt
        string status "DRAFT | PUBLISHED | ON_SALE | CONCLUDED | CANCELLED"
        string eventCode UK
    }
    
    TicketType {
        uuid id PK
        uuid concertId FK
        string name "VIP | SVIP | GA | CAT1"
        string zoneCode
        decimal price
        int totalQuantity
        int maxPerAccount
    }

    TicketInventory {
        uuid ticketTypeId PK, FK
        int totalQuantity
        int availableQuantity
        int reservedQuantity
        int soldQuantity
    }
    
    Order {
        uuid id PK
        uuid userId FK
        uuid concertId FK
        string status "pending | paid | expired | cancelled"
        decimal totalAmount
        string idempotencyKey UK
        datetime createdAt
        datetime paidAt
    }
    
    OrderItem {
        uuid id PK
        uuid orderId FK
        uuid ticketTypeId FK
        int quantity
        decimal unitPrice
    }
    
    Ticket {
        uuid id PK
        uuid orderItemId FK
        uuid userId FK
        string seatNumber
        string qrCode UK
        string status "valid | used | cancelled"
        datetime issuedAt
        datetime usedAt
    }
    
    CheckinLog {
        uuid id PK
        uuid ticketId FK
        uuid gateStaffId FK
        string deviceId
        boolean synced
        datetime scannedAtLocal
        datetime syncedAt
    }
```

#### Mô tả chi tiết mối quan hệ và Ràng buộc nhất quán (Consistency Constraints):
*   **TicketInventory (Tồn kho vé):** Sử dụng quan hệ 1-1 với `TicketType`. Trường `availableQuantity` đại diện cho số lượng vé thực sự còn trống để bán và được liên tục đồng bộ giảm khi có lệnh `DECRBY` trên Redis trong luồng giữ vé.
*   **Idempotency Key:** Cấu hình unique (`UK`) trên trường `idempotencyKey` của bảng `Order` và bảng `Payment` để đảm bảo cơ chế không ghi trùng dữ liệu ở mức Database vật lý (ngăn chặn double inserts do lỗi mạng).
*   **Mối liên kết soát vé (CheckinLog):** Bảng `CheckinLog` liên kết trực tiếp tới `Ticket` (quan hệ 1-n) để lưu lại dấu vết lịch sử quét vé của nhân sự soát vé (`gateStaffId`), hỗ trợ đối soát chéo và xử lý xung đột ngoại tuyến.


## Thiết kế các cơ chế bảo vệ hệ thống

### Xử lý cổng thanh toán không ổn định
Để bảo vệ hệ thống trước sự cố nghẽn mạng hoặc sập dịch vụ từ cổng thanh toán đối tác (VNPAY/MoMo), TicketBox áp dụng mô hình **Circuit Breaker (Bộ ngắt mạch)** kết hợp phương án giảm cấp trải nghiệm **Graceful Degradation (Fallback)**.

1.  **Các trạng thái của Bộ ngắt mạch (Circuit Breaker States):**
    *   **CLOSED (Mạch đóng):** Dịch vụ hoạt động bình thường. Mọi yêu cầu gọi sang cổng thanh toán đối tác đều được thực thi và giám sát.
    *   **OPEN (Ngắt mạch):** Khi phát hiện cổng thanh toán đối tác bị lỗi liên tục đạt ngưỡng kích hoạt, bộ ngắt mạch lập tức chuyển sang trạng thái OPEN. Mọi yêu cầu thanh toán mới sẽ bị chặn và trả về lỗi ngay lập tức (Fail-fast).
    *   **HALF-OPEN (Mạch hé mở):** Sau một thời gian chờ phục hồi (Cooldown Period - mặc định 60 giây), bộ ngắt mạch tự động chuyển sang HALF-OPEN và cho phép một số lượng giới hạn request thử nghiệm đi qua để kiểm tra xem hệ thống đối tác đã ổn định chưa.
2.  **Ngưỡng kích hoạt chuyển đổi trạng thái (Thresholds):**
    *   *CLOSED $\rightarrow$ OPEN:* Khi phát hiện kết nối tới API MoMo/VNPAY gặp lỗi kết nối/timeout liên tiếp **5 lần** (hoặc tỷ lệ lỗi vượt quá **50%** trong số 20 request gần nhất).
    *   *OPEN $\rightarrow$ HALF-OPEN:* Chờ hết thời gian Cooldown **60 giây**.
    *   *HALF-OPEN $\rightarrow$ CLOSED:* Nếu **5 request** thử nghiệm liên tiếp thành công 100%.
    *   *HALF-OPEN $\rightarrow$ OPEN:* Nếu có **bất kỳ 1 request** thử nghiệm nào thất bại.
3.  **Hành vi khi xảy ra lỗi (Graceful Degradation / Fallback):**
    *   *Đối với luồng thanh toán:* Hệ thống trả về lỗi nhanh (Fail-fast): *"Hệ thống thanh toán đang bảo trì, vui lòng chọn phương thức thanh toán khác hoặc thử lại sau"*. Đồng thời, số vé giữ tạm trên RAM Redis sẽ được phục vụ khôi phục ngay lập tức bằng lệnh nguyên tử `INCRBY` (tránh chiếm kho vé).
    *   *Đối với toàn bộ hệ thống:* Toàn bộ các dịch vụ công cộng khác như duyệt danh sách concert, lọc tìm kiếm, xem trang chi tiết nghệ sĩ vẫn hoạt động bình thường do được cô lập và phục vụ độc lập qua bộ nhớ đệm cache Redis.


### Kiểm soát tải đột biến
<!-- Thuật toán, cấu hình ngưỡng, key giới hạn, hành vi -->

### Chống trừ tiền hai lần
<!-- Cách sinh key, nơi lưu trữ, TTL, xử lý trùng lặp -->

### Caching
<!-- Mô hình (Cache-aside/Write-through), xử lý bất đồng nhất, TTL, Invalidate -->