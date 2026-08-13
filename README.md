# TicketBox

TicketBox là hệ thống bán vé concert gồm backend NestJS, web khách hàng, web quản trị và ứng dụng Android scanner.

## Tech Stack

- Backend: Node.js 20+, NestJS, TypeScript, Prisma, PostgreSQL, Redis, RabbitMQ, BullMQ, MinIO/S3.
- Customer frontend: Next.js 16, React 18, Tailwind CSS.
- Admin frontend: Next.js 16, React 18, Tailwind CSS.
- Scanner mobile app: Android native Kotlin.
- Local infrastructure: Docker Compose.

## Yêu Cầu Môi Trường

- Node.js `>=20.9.0`
- npm
- Docker và Docker Compose
- Android Studio và Android SDK nếu build `scanner-android`

## Khởi Chạy Local

### 1. Hạ tầng

```bash
docker compose up -d
```

Docker Compose khởi động PostgreSQL, Redis, RabbitMQ, MinIO và ngrok.

### 2. Backend

```bash
cd backend
cp .env.example .env
npm install
npm run prisma:migrate
npx prisma db seed
npm run dev
```

Backend chạy tại `http://localhost:3000`.

Các biến bắt buộc cần cấu hình trước khi chạy thật:

- `DATABASE_URL`
- `JWT_SECRET`
- `QR_SECRET_KEY` với tối thiểu 32 ký tự, không dùng placeholder
- `VNPAY_TMN_CODE` và `VNPAY_HASH_SECRET` nếu dùng VNPAY
- `CORS_ORIGIN` dạng danh sách origin phân tách bằng dấu phẩy

Mock payment webhook mặc định bị tắt. Chỉ bật khi test local:

```env
ENABLE_MOCK_PAYMENT_WEBHOOK="true"
MOCK_PAYMENT_WEBHOOK_SECRET="replace-with-a-random-secret-at-least-32-characters-long"
```

Khi gọi `POST /api/v1/payments/webhook`, gửi header:

```http
x-mock-payment-webhook-secret: <MOCK_PAYMENT_WEBHOOK_SECRET>
```

### 3. Customer Frontend

```bash
cd frontend
npm install
npm run dev
```

Customer frontend chạy tại `http://localhost:3001`.

### 4. Admin Frontend

```bash
cd admin-frontend
npm install
npm run dev
```

Admin frontend chạy tại `http://localhost:3002`.

### 5. Android Scanner

Mở thư mục `scanner-android` bằng Android Studio. Nếu build bằng terminal, cấu hình Android SDK bằng một trong hai cách:

- đặt biến môi trường `ANDROID_HOME`
- tạo `scanner-android/local.properties` có `sdk.dir=<duong-dan-android-sdk>`

## Kiểm Tra

Backend:

```bash
cd backend
npm run build
npx tsc --noEmit
npm audit
```

Customer frontend:

```bash
cd frontend
npm run lint
npm run build
npm audit
```

Admin frontend:

```bash
cd admin-frontend
npm run lint
npm run build
npm audit
```

## Tài Khoản Seed

Sau khi chạy `npx prisma db seed`, có thể dùng các tài khoản demo sau với mật khẩu `Password123!`:

- `organizer@example.com`: quản trị concert và staff
- `staff@example.com`: soát vé bằng scanner
- `audience@example.com`: xem concert, giữ vé, thanh toán và xem e-ticket
