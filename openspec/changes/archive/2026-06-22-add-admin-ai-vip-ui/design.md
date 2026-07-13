## Context

`admin-frontend` là ứng dụng Next.js 14 chạy ở cổng 3002. Giao diện hiện được tổ chức trong một trang dashboard với thanh điều hướng theo tab, dùng `adminApi` trong `lib/api.ts`, bearer token lưu trong session và các component nội bộ như `Panel`, `DataTable`, `Field`, `StatusBadge`.

Backend Express đã cung cấp API cho concert, AI Artist Bio, sponsor email và VIP import report. Điểm thiếu hiện tại là form tạo concert chưa gửi `eventCode`, trong khi các luồng AI/VIP chưa có UI và phải thao tác qua Postman.

## Goals / Non-Goals

**Goals:**

- Cho phép ban tổ chức hoàn thành các luồng `eventCode`, sponsor email, AI Artist Bio và VIP Sync từ `admin-frontend`.
- Tái sử dụng cách xác thực, xử lý lỗi, tab, bảng, form, màu sắc và mật độ thông tin hiện tại.
- Thể hiện rõ trạng thái xử lý bất đồng bộ và dừng polling đúng lúc.
- Giữ contract TypeScript của frontend đồng bộ với response backend.

**Non-Goals:**

- Không thay đổi Prisma schema hoặc API backend trong change này.
- Không cung cấp UI nhập secret Gemini, IMAP, SMTP, MinIO hoặc cấu hình cron.
- Không bổ sung thao tác unpublish/retry AI Bio hoặc chạy cron VIP thủ công vì backend chưa có API tương ứng.
- Không thay thế hoặc xóa tab whitelist cấu hình mailbox hiện có.

## Decisions

### 1. Mở rộng dashboard hiện tại thay vì tạo ứng dụng hoặc layout mới

Thêm ba tab `AI Artist Bio`, `Email nhãn hàng` và `VIP Sync` vào cùng hệ thống `TabKey`. Các tab dùng concert selector và session hiện có, tránh tạo luồng đăng nhập hoặc navigation thứ hai.

UI tiếp tục dùng nền `#eef3f8`, panel trắng viền slate, cyan làm màu nhấn, bảng dữ liệu hiện có, Lucide icon và bán kính tối đa theo component hiện tại. Nội dung ưu tiên bảng/form gọn, không lồng card và không thêm hero/khối marketing.

### 2. `eventCode` là dữ liệu do ban tổ chức nhập

Form concert thêm trường bắt buộc `eventCode`, chuẩn hóa trim và uppercase trước khi gửi. Mã được hiển thị trong danh sách và selector để ban tổ chức dùng cùng giá trị khi cấu hình sponsor CSV. Không tự sinh mã ở client vì mã này là contract trao đổi với nhãn hàng và phải ổn định.

### 3. API client dùng type cụ thể và multipart riêng cho PDF

`lib/api.ts` bổ sung type `ArtistBio`, `SponsorEmail`, `GuestImportReport`, `GuestImportRowError` và `VipGuest`. Upload PDF dùng helper riêng với `FormData`; trình duyệt tự tạo multipart boundary và client không đặt `Content-Type: application/json` cho request này.

Tất cả endpoint mới tiếp tục gửi access token. Lỗi API được chuyển về cùng cơ chế `Error` hiện có để dashboard hiển thị thống nhất.

### 4. AI Bio được quản lý theo concert đang chọn

Tab AI dùng `selectedConcertId` hiện có. Khi đổi concert, UI hủy polling cũ, tải bản AI Bio mới nhất và xóa nội dung editor của concert trước. Polling chạy mỗi 3 giây chỉ khi trạng thái là `UPLOADED` hoặc `PROCESSING`, và dừng khi đạt `AI_GENERATED`, `APPROVED`, `PUBLISHED`, `FAILED`, khi đổi tab hoặc khi component unmount.

Editor chỉ cho duyệt khi có bio do AI tạo. Publish chỉ khả dụng ở trạng thái `APPROVED`. Với `PUBLISHED`, UI hiển thị nội dung đã publish và cho phép upload một PDF mới để bắt đầu phiên bản khác; không giả lập thao tác unpublish.

### 5. Sponsor email và VIP report là hai nguồn dữ liệu khác nhau

Tab **Email nhãn hàng** gọi `/vip-guest-sync/sponsors`, không dùng nhầm `WhitelistEmailConfig`. Concert được chọn qua danh sách `eventCode`; UI gửi `allowedEventCodes` và hỗ trợ toggle `isActive`.

Tab **VIP Sync** hiển thị report mới nhất trước, các tổng số `totalRows`, `successRows`, `duplicateRows`, `errorRows`, `emailSentRows`, sau đó tải endpoint chi tiết khi người dùng chọn report. Chi tiết gồm lỗi từng dòng và trạng thái email của khách đã import. `NO_FILE` và lỗi mailbox `FAILED` phải được phân biệt bằng badge và thông điệp.

### 6. Không làm mới toàn dashboard sau mọi mutation

Các mutation AI/sponsor chỉ refresh phạm vi dữ liệu liên quan. Hàm `loadAll` hiện tại vẫn dành cho dữ liệu admin chung. Quyết định này tránh việc upload/review bio gây gọi lại staff, whitelist và revenue không liên quan.

## Risks / Trade-offs

- **Polling tạo request thừa khi backend chậm** → Chỉ có một timer cho concert hiện tại, khóa request chồng lặp và dừng ở trạng thái terminal.
- **Hai khái niệm whitelist email dễ gây nhầm** → Giữ tab cũ với tên cấu hình mailbox; tab mới dùng tên rõ ràng **Email nhãn hàng** và type/API riêng.
- **Report lớn làm bảng chi tiết nặng** → Mặc định chỉ tải danh sách report; chỉ tải `rowErrors` và `vipGuests` khi chọn một report, vùng bảng cho phép cuộn ngang.
- **Mã sự kiện bị trùng hoặc sai định dạng** → Validate bắt buộc ở client nhưng vẫn hiển thị nguyên lỗi backend làm nguồn xác thực cuối cùng.
- **Token hết hạn trong lúc polling** → Dừng polling, hiển thị lỗi xác thực và dùng hành vi logout/session hiện có.

## Migration Plan

1. Mở rộng type/API client mà không thay đổi endpoint cũ.
2. Thêm `eventCode` vào form concert để khôi phục tương thích backend trước.
3. Thêm các tab sponsor, AI Bio và VIP Sync độc lập.
4. Build `admin-frontend`, kiểm tra responsive và chạy smoke flow với tài khoản organizer seed.
5. Có thể rollback riêng thay đổi `admin-frontend`; backend và database không cần rollback.

## Open Questions

- Phân trang report chưa có ở backend; UI change này hiển thị tập dữ liệu API hiện trả về và để phân trang server-side cho change sau.
- Retry AI Bio và gửi lại email VIP cần endpoint backend mới nên chưa nằm trong phạm vi triển khai.
