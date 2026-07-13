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

## Member A: Auth, RBAC, Admin APIs

OpenSpec change:

- `openspec/changes/2026-06-17-auth-rbac-admin/`

Main backend endpoints are mounted under `/api/v1`:

- Auth: `POST /auth/register`, `POST /auth/login`, `POST /auth/logout`, `POST /auth/refresh`, `GET /auth/me`
- Admin concerts: `GET|POST /admin/concerts`, `GET|PATCH /admin/concerts/:id`, `POST /admin/concerts/:id/publish`, `POST /admin/concerts/:id/cancel`
- Ticket types: `GET|POST /admin/concerts/:concertId/ticket-types`, `PATCH|DELETE /admin/ticket-types/:id`
- Inventory: `GET|PATCH /admin/ticket-types/:id/inventory`
- Staff accounts: `GET|POST /admin/staff`
- Staff assignments: `GET|POST /admin/concerts/:concertId/staff-assignments`, `DELETE /admin/staff-assignments/:id`
- Whitelist email configs: `GET|POST /admin/whitelist-email-configs`, `PATCH|DELETE /admin/whitelist-email-configs/:id`
- Internal CSV worker config: `GET /internal/whitelist-email-configs/active`
- Revenue: `GET /admin/concerts/:id/revenue-summary`, `GET /admin/concerts/:id/sales-stats`
- OpenAPI JSON: `GET /openapi/member-a.json`

Seed accounts after `npx prisma db seed`:

| Email | Role | Password |
|---|---|---|
| `organizer@example.com` | `ORGANIZER` | `Password123!` |
| `staff@example.com` | `CHECKIN_STAFF` | `Password123!` |
| `audience@example.com` | `AUDIENCE` | `Password123!` |

Run locally:

```bash
docker compose up -d
cd backend
npm install
npx prisma migrate dev
npx prisma db seed
npm run dev
```

Verify Member A flow:

```bash
cd backend
npm run build
npm run test:member-a
```

---

## AI Artist Bio và đồng bộ khách mời VIP

Các biến cấu hình được mô tả trong `backend/.env.example`. Chạy hạ tầng cục bộ bằng:

```bash
docker compose up -d postgres redis rabbitmq minio
```

MinIO API dùng cổng `9000`, giao diện quản trị dùng `http://localhost:9001`.

CSV khách mời phải có đúng các header sau:

```csv
fullName,email,phone,company,eventCode,note
Nguyen Van A,a@example.com,0900000001,Sponsor A,SKYTOUR-2026-HN,Khach moi VIP
```

Luồng AI Artist Bio dành cho tài khoản `ORGANIZER`:

1. Upload PDF bằng `POST /api/v1/ai/artist-bio/concerts/:concertId/upload`, multipart field `file`.
2. Worker trích xuất PDF, gọi Gemini và chuyển trạng thái thành `AI_GENERATED`.
3. Xem bản sinh qua `GET /api/v1/ai/artist-bio/concerts/:concertId`.
4. Duyệt/chỉnh sửa bằng `PATCH /api/v1/ai/artist-bio/:id/review`.
5. Publish bằng `POST /api/v1/ai/artist-bio/:id/publish`; API chi tiết concert chỉ trả bio đã publish.

Luồng VIP Guest Sync:

1. Ban tổ chức quản lý email nhãn hàng qua `/api/v1/vip-guest-sync/sponsors`.
2. Cron đọc attachment CSV từ mailbox IMAP, lưu bản gốc vào MinIO và tạo import job.
3. Worker kiểm tra `eventCode`, email/phone và trùng lặp, sau đó sinh QR và gửi e-ticket.
4. Ban tổ chức xem kết quả tại `/api/v1/vip-guest-sync/import-reports`.
5. Nhân viên quét QR VIP bằng `POST /api/v1/checkins/scan` như vé thường.
