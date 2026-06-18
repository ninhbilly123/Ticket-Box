# TicketBox

Hệ thống bán vé concert trực tuyến, giải quyết các vấn đề thực tế tại Việt Nam: sập server khi mở bán, khán giả bị trừ tiền không nhận được vé, và scalper dùng bot vét vé hàng loạt.

> Dự án môn **Thiết kế phần mềm** — code thiết kế được sinh hỗ trợ bởi [OpenSpec](https://openspec.dev).

---

## Mô tả bài toán

TicketBox phục vụ 3 nhóm người dùng với các nghiệp vụ riêng biệt:

| Nhóm | Nghiệp vụ chính |
|---|---|
| **Khán giả** | Xem concert, đặt vé, thanh toán (VNPAY/MoMo), nhận e-ticket QR |
| **Ban tổ chức** | Quản lý concert, cấu hình vé, xem doanh thu, quản lý nhân sự |
| **Nhân sự soát vé** | Quét QR tại cổng, soát vé offline, đồng bộ dữ liệu |

Các thách thức kỹ thuật cốt lõi hệ thống phải giải quyết:

- **Race condition** — hàng chục nghìn người mua cùng lúc khi mở bán
- **Rate limiting** — bảo vệ API khi có ~80.000 người truy cập đồng thời
- **Circuit Breaker** — tự động ngắt khi cổng thanh toán gặp sự cố
- **Idempotency** — chống trừ tiền hai lần khi mạng không ổn định
- **Offline check-in** — soát vé tại sân vận động không có sóng
- **Cache-aside (Redis)** — giảm tải DB cho trang danh sách và chi tiết concert

---

## 🛠 Tech Stack

### Backend
| Thành phần | Công nghệ |
|---|---|
| Runtime | Node.js 20 LTS |
| Framework | Express.js |
| Database | PostgreSQL 16 |
| Cache / Lock | Redis 7 |
| Message Broker | RabbitMQ |
| Authentication | JWT (jsonwebtoken) |
| Validation | Zod |
| ORM | Prisma |

### Frontend
| Thành phần | Công nghệ |
|---|---|
| Framework | React 18 / Next.js 14 (App Router) |
| Styling | Tailwind CSS |
| State | Zustand |
| HTTP Client | Axios |

### Infrastructure & Tooling
| Thành phần | Công nghệ |
|---|---|
| Containerization | Docker + Docker Compose |
| API Spec | OpenAPI 3.1 (OpenSpec) |

---

## Cấu trúc thư mục

```
ticketbox/
├── specs/                          # Tài liệu thiết kế (OpenSpec)
│   ├── proposal.md                 # Mô tả bài toán, phạm vi, mục tiêu
│   ├── design.md                   # Kiến trúc, C4 diagram, DB schema
│   └── README.md                   # File này
│
├── backend/                        # Node.js + Express API server
│   ├── src/
│   │   ├── modules/                # Modular Monolith — mỗi module độc lập
│   │   │   ├── auth/               # Đăng ký, đăng nhập, JWT, RBAC
│   │   │   ├── concert/            # CRUD concert, sơ đồ chỗ ngồi
│   │   │   ├── ticket/             # Đặt vé, inventory lock, per-user limit
│   │   │   ├── payment/            # VNPAY/MoMo, idempotency, circuit breaker
│   │   │   ├── notification/       # Email, in-app, observer pattern
│   │   │   ├── checkin/            # Soát vé QR, offline sync
│   │   │   ├── admin/              # Quản trị, thống kê, guest list
│   │   │   └── ai/                 # Upload PDF, gọi AI API, Artist Bio
│   │   ├── shared/                 # Dùng chung giữa các module
│   │   │   ├── middleware/         # Auth, rate limit, error handler
│   │   │   ├── lib/                # Redis client, Prisma client, logger
│   │   │   └── types/              # TypeScript types dùng chung
│   │   └── app.ts                  # Entry point Express
│   ├── prisma/
│   │   └── schema.prisma           # DB schema
│   ├── workers/                    # Background jobs
│   │   ├── notification.worker.ts
│   │   ├── ai-bio.worker.ts
│   │   └── csv-import.worker.ts
│   └── package.json
│
├── frontend/                       # Next.js 14 App Router
│   ├── app/
│   │   ├── (public)/               # Trang khán giả (concert, mua vé)
│   │   ├── (admin)/                # Trang ban tổ chức
│   │   └── (checkin)/              # Trang soát vé (PWA offline-ready)
│   ├── components/
│   ├── lib/
│   └── package.json
│
├── docker-compose.yml              # PostgreSQL + Redis + RabbitMQ local

```

> **Lưu ý:** Thư mục `backend/` và `frontend/` sẽ được khởi tạo khi bắt đầu giai đoạn code. Hiện tại repo chỉ chứa `specs/`.

---

## Quy tắc code

### Nguyên tắc chung
- Mỗi module trong `backend/src/modules/` **không được** import trực tiếp vào `src` của module khác — chỉ giao tiếp qua interface hoặc event.
- Không đặt business logic trong controller — controller chỉ nhận request, gọi service, trả response.
- Mọi input từ client phải được validate bằng **Zod schema** trước khi vào service.
- Không commit file `.env` — dùng `.env.example` làm template.

### Đặt tên
```
// File: kebab-case
ticket.service.ts
concert.controller.ts
create-order.dto.ts

// Class / Interface: PascalCase
class TicketService {}
interface CreateOrderDto {}

// Hàm / biến: camelCase
const ticketCount = 0;
function createOrder(dto: CreateOrderDto) {}

// Hằng số: SCREAMING_SNAKE_CASE
const MAX_TICKETS_PER_USER = 4;
const RESERVATION_TTL_SECONDS = 600;
```

### TypeScript
- Không dùng `any` — dùng `unknown` nếu type chưa xác định.
- Luôn khai báo kiểu trả về cho hàm public trong service.
- Interface đặt trong `types/` nếu dùng chung, đặt cùng file nếu chỉ dùng nội bộ.

### API Response
Tất cả response theo cấu trúc thống nhất:
```json
// Thành công
{ "success": true, "data": { ... } }

// Lỗi
{ "success": false, "error": { "code": "TICKET_NOT_FOUND", "message": "..." } }

// Phân trang
{ "success": true, "data": [...], "pagination": { "page": 1, "limit": 20, "total": 150 } }
```

### Xử lý lỗi
- Dùng custom error class `AppError` kế thừa từ `Error`, có `statusCode` và `errorCode`.
- Không dùng `try/catch` lồng nhau quá 2 cấp — tách ra hàm riêng.
- Luôn log error với context đủ để debug (userId, concertId, requestId...).

---

## Quy tắc viết Commit

Dùng chuẩn **Conventional Commits**:

```
<type>(<scope>): <mô tả ngắn>

[body - tuỳ chọn]

[footer - tuỳ chọn]
```

### Các type hợp lệ

| Type | Khi nào dùng |
|---|---|
| `feat` | Thêm tính năng mới |
| `fix` | Sửa bug |
| `docs` | Chỉ thay đổi tài liệu (README, spec) |
| `refactor` | Refactor code, không thêm tính năng hay sửa bug |
| `test` | Thêm hoặc sửa test |
| `chore` | Cập nhật config, dependency, CI |
| `perf` | Cải thiện hiệu năng |

### Scope theo module

`auth` · `concert` · `ticket` · `payment` · `notification` · `checkin` · `admin` · `ai` · `specs` · `infra`

### Ví dụ commit hợp lệ

```bash
feat(ticket): add seat reservation with 10-minute TTL
fix(payment): handle MoMo timeout with circuit breaker fallback
docs(specs): update C4 Level 2 container diagram
refactor(auth): extract JWT verify logic to shared middleware
chore(infra): add Redis service to docker-compose
```

### Quy tắc bổ sung
- Dòng đầu **không quá 72 ký tự**, viết thường, **không dấu chấm** cuối câu.
- Commit một việc — không gộp nhiều tính năng không liên quan vào một commit.
- Không commit code bị comment out hoặc `console.log` debug.

---

## Git Workflow

Nhóm dùng **GitHub Flow** đơn giản hoá, phù hợp với team nhỏ 4 người làm tài liệu:

### Nhánh chính

| Nhánh | Mục đích |
|---|---|
| `main` | Luôn ở trạng thái ổn định, sẵn sàng nộp |
| `develop` | Tích hợp các nhánh feature trước khi merge vào `main` |

### Nhánh tính năng

Đặt tên theo pattern: `<type>/<scope>-<mô tả>`

```bash
docs/specs-auth-rbac
docs/specs-ticket-flow
docs/c4-level2-diagram
fix/specs-notification-missing-retry
```

### Quy trình làm việc

```
1. Tạo nhánh từ develop
   git checkout develop
   git pull origin develop
   git checkout -b docs/specs-auth-rbac

2. Làm việc & commit thường xuyên
   git add specs/design.md
   git commit -m "docs(specs): add RBAC role definition and JWT flow"

3. Push lên remote
   git push origin docs/specs-auth-rbac

4. Tạo Pull Request → develop
   - Title: [scope] Mô tả ngắn
   - Description: Mô tả thay đổi, screenshot nếu có
   - Assign ít nhất 1 người review

5. Sau khi được approve → Squash & Merge vào develop

6. Cuối giai đoạn → merge develop vào main
   (chỉ team lead thực hiện)
```

### Quy tắc Pull Request
- **Không tự merge PR của mình** — phải có ít nhất 1 người review và approve.
- PR không được có conflict trước khi merge — người tạo PR tự resolve conflict.
- Mỗi PR chỉ giải quyết **một vấn đề** hoặc **một tính năng**.
- Nếu PR liên quan đến phần của người khác, mention trực tiếp trong comment.

### Giải quyết conflict
```bash
# Khi nhánh của bạn bị outdated
git checkout docs/specs-auth-rbac
git fetch origin
git rebase origin/develop
# Giải quyết conflict trong editor → git add → git rebase --continue
```

---

## Tài liệu liên quan

- [`specs/proposal.md`](./proposal.md) — Mô tả bài toán, phạm vi, mục tiêu
- [`specs/design.md`](./design.md) — Kiến trúc hệ thống, C4 diagram, DB schema, RBAC, cơ chế kỹ thuật

---

## AI Artist Bio va VIP Guest Sync

### Cau hinh moi

Backend can cac bien moi trong `backend/.env.example`:

- `MINIO_ENDPOINT`, `MINIO_ACCESS_KEY`, `MINIO_SECRET_KEY`: ket noi MinIO/S3-compatible storage.
- `ARTIST_BIO_BUCKET`, `VIP_GUEST_IMPORT_BUCKET`, `TICKET_ASSET_BUCKET`: bucket luu PDF, CSV va asset e-ticket.
- `GEMINI_API_KEY`, `GEMINI_MODEL`: goi Google Gemini API that de sinh artist bio tieng Viet.
- `IMAP_HOST`, `IMAP_PORT`, `IMAP_USER`, `IMAP_PASSWORD`, `IMAP_MAILBOX`: mailbox demo doc CSV khach moi VIP.
- `VIP_GUEST_IMPORT_CRON`: lich cron doc mailbox, mac dinh `0 1 * * *`.
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`: gui e-ticket VIP qua email.

Docker Compose da co them MinIO:

```bash
docker compose up -d postgres redis rabbitmq minio
```

MinIO console mac dinh: `http://localhost:9001`

```text
user: minioadmin
password: minioadmin123
```

### CSV khach moi VIP

Header bat buoc:

```csv
fullName,email,phone,company,eventCode,note
Nguyen Van A,a@example.com,0900000001,Sponsor A,ATSH-2026-HCM,Khach moi hang VIP
Tran Thi B,b@example.com,0900000002,Sponsor A,ATVNCG-2026-HN,
```

Quy tac import:

- `eventCode` map den `Concert.eventCode`.
- `fullName` bat buoc.
- Can co it nhat mot trong `email` hoac `phone`.
- Chong trung theo `concertId + email`, fallback `concertId + phone`.
- Dong loi/trung bi bo qua, dong hop le van duoc import.
- Moi khach moi co email hop le se duoc tao QR e-ticket va gui mail.

### Demo luong AI Artist Bio

1. Cau hinh `GEMINI_API_KEY` va MinIO.
2. Upload PDF qua API `POST /api/v1/ai/artist-bio/concerts/:concertId/upload` voi field file la `file`.
3. Worker xu ly PDF, goi Gemini va chuyen trang thai sang `AI_GENERATED`.
4. Ban to chuc goi `PATCH /api/v1/ai/artist-bio/:id/review` de duyet/chinh sua bio.
5. Ban to chuc goi `POST /api/v1/ai/artist-bio/:id/publish`.
6. API chi tiet concert chi tra `artistBio` khi bio da `PUBLISHED`.

### Demo luong VIP Guest Sync

1. Cau hinh sponsor email qua `POST /api/v1/vip-guest-sync/sponsors`.
2. Sponsor gui CSV vao mailbox IMAP demo.
3. Cron worker doc mailbox, luu CSV goc vao MinIO va tao import job.
4. Import worker validate CSV, tao `VipGuest`, sinh QR va enqueue email e-ticket.
5. Ban to chuc xem report qua `GET /api/v1/vip-guest-sync/import-reports`.
6. Nhan su soat ve quet QR VIP bang endpoint `POST /api/v1/tickets/scan`.
