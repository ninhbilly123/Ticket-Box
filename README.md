#  TicketBox - Hệ thống Bán vé Concert Trực tuyến

Hệ thống bán vé concert trực tuyến tối ưu hóa cho tải cao, giải quyết các thách thức thực tế tại Việt Nam: sập máy chủ khi mở bán sự kiện hot, trừ tiền ngân hàng nhưng không nhận được vé, bot quét vé hàng loạt, và soát vé ngoại tuyến trong điều kiện mất sóng tại sân vận động.

---

##  Công nghệ Sử dụng (Tech Stack)

*   **Backend:** Node.js 20 (Express.js), TypeScript, Prisma ORM, PostgreSQL (Database chính), Redis (Cache, Lock, Queue), RabbitMQ (Message Broker), BullMQ (Background Job).
*   **Customer Web Frontend:** React 18, Next.js 14 App Router, Tailwind CSS, Zustand, Axios.
*   **Admin Web Frontend:** React, Next.js, Tailwind CSS, Axios.
*   **Scanner Mobile App:** Native Android (Kotlin), CameraX, Google ML Kit Barcode Scanning.
*   **Hạ tầng:** Docker & Docker Compose, MinIO (Object Storage tương thích S3).

---

##  Hướng dẫn Khởi chạy Dự án (Từng bước)

Hãy chắc chắn máy tính của bạn đã cài đặt sẵn **Node.js LTS (v20+)**, **Docker** và **Docker Compose**.

### Bước 1: Khởi động Hạ tầng Dịch vụ (Docker)
Tại thư mục gốc của dự án `Ticket-Box-`, chạy lệnh sau để khởi động cơ sở dữ liệu, bộ nhớ đệm, message broker và storage cục bộ:
```bash
docker compose up -d
```
*Lệnh này sẽ tải và khởi chạy 4 container: PostgreSQL, Redis, RabbitMQ và MinIO.*

### Bước 2: Thiết lập và Khởi chạy Backend API
1.  Di chuyển vào thư mục backend:
    ```bash
    cd backend
    ```
2.  Tạo tệp cấu hình môi trường `.env` từ tệp mẫu:
    *   **Windows (PowerShell):**
        ```powershell
        cp .env.example .env
        ```
    *   **macOS / Linux:**
        ```bash
        cp .env.example .env
        ```
3.  Cài đặt các gói thư viện Node.js:
    ```bash
    npm install
    ```
4.  Cập nhật cấu trúc database và chạy các bản Migrations:
    ```bash
    npx prisma migrate dev
    ```
5.  Khởi tạo dữ liệu mẫu (Seeding) bao gồm cấu hình các concert mở bán, phân hạng vé, tồn kho và các tài khoản người dùng mẫu:
    ```bash
    npx prisma db seed
    ```
6.  Khởi chạy Backend API Server ở chế độ phát triển (Development mode):
    ```bash
    npm run dev
    ```
    *API Server sẽ chạy tại địa chỉ: `http://localhost:3000`*

### Bước 3: Khởi chạy Giao diện Khán giả (Customer Frontend)
Mở một cửa sổ Terminal mới ở thư mục gốc của dự án:
1.  Di chuyển vào thư mục frontend:
    ```bash
    cd frontend
    ```
2.  Cài đặt thư viện:
    ```bash
    npm install
    ```
3.  Khởi chạy Frontend local server:
    ```bash
    npm run dev
    ```
    *Trang dành cho khán giả sẽ chạy tại: `http://localhost:3001`*

### Bước 4: Khởi chạy Giao diện Quản trị (Admin Frontend)
Mở một cửa sổ Terminal mới ở thư mục gốc của dự án:
1.  Di chuyển vào thư mục admin-frontend:
    ```bash
    cd admin-frontend
    ```
2.  Cài đặt thư viện:
    ```bash
    npm install
    ```
3.  Khởi chạy Admin local server:
    ```bash
    npm run dev
    ```
    *Trang quản trị dành cho ban tổ chức sẽ chạy tại: `http://localhost:3002`*

### Bước 5: Khởi chạy Ứng dụng Soát vé Android (Scanner App)
1.  Mở thư mục [scanner-android](file:///n:/DESIGN%20SYSTEM/DOAN/Ticket-Box-/scanner-android/) bằng phần mềm **Android Studio**.
2.  Chờ Gradle đồng bộ (Sync) thư viện hoàn tất.
3.  Kết nối thiết bị di động Android thật hoặc mở trình giả lập Emulator và bấm **Run App** (`Shift + F10`).
4.  Khi đăng nhập, nhập URL API bằng địa chỉ IP LAN của máy tính chạy backend (ví dụ: `http://192.168.1.5:3000/api/v1`).

---

##  Danh sách Tài khoản Kiểm thử (Seed Accounts)

Sau khi chạy lệnh `npx prisma db seed`, hệ thống đã có sẵn 3 tài khoản với mật khẩu mặc định là **`Password123!`**:

| Email | Vai trò (Role) | Chức năng kiểm thử |
| :--- | :--- | :--- |
| **`organizer@example.com`** | `ORGANIZER` (Ban tổ chức) | Đăng nhập Admin Portal để tạo, duyệt thông tin Concert, cấu hình phân hạng vé và xem thống kê doanh thu. |
| **`staff@example.com`** | `CHECKIN_STAFF` (Nhân viên soát vé) | Đăng nhập App Scanner di động để thực hiện quét QR soát vé và đồng bộ offline logs. |
| **`audience@example.com`** | `AUDIENCE` (Khán giả) | Đăng nhập trang Khán giả để thực hiện luồng xem, đặt giữ chỗ, thanh toán Sandbox và xem e-ticket của tôi. |

---

