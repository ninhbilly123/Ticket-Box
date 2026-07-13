## Context

Route `frontend/app/(public)/concert/[id]/page.tsx` hiện chịu đồng thời hai trách nhiệm: trình bày concert và điều phối toàn bộ state của waiting room, giữ vé, thanh toán, e-ticket, lịch sử đơn hàng. Card checkout xuất hiện ngay khi khán giả mở một concert từ danh sách, làm luồng đọc thông tin và luồng giao dịch cạnh tranh trong cùng màn hình.

Customer frontend đang dùng Next.js App Router và API `GET /concerts/:id` đã cung cấp đủ dữ liệu cho cả hai màn hình. Vì vậy thay đổi chỉ cần tổ chức lại route/component, không cần backend hoặc state toàn cục mới.

## Goals / Non-Goals

**Goals:**

- Tạo một trang chi tiết tập trung vào nội dung concert và Artist Bio.
- Chỉ hiển thị các control đặt vé sau khi người dùng bấm CTA `Đặt vé`.
- Giữ nguyên toàn bộ hành vi chọn loại vé, waiting room, giữ vé, thanh toán và lịch sử đơn hàng.
- Duy trì điều hướng đúng concert khi quay lại hoặc đăng nhập giữa luồng booking.
- Giữ style tối và responsive convention hiện tại.

**Non-Goals:**

- Không thay đổi API, database, quy tắc còn vé hoặc thanh toán.
- Không gộp state giữa trang chi tiết và booking; mỗi route tự tải dữ liệu mới nhất.
- Không thêm bước xác nhận hoặc wizard mới bên trong booking.
- Không thay đổi trang admin hoặc scanner.

## Decisions

### 1. Tách bằng route thay vì modal hoặc state ẩn/hiện

Trang thông tin giữ route `/concert/[id]`; luồng giao dịch chuyển sang `/concert/[id]/booking`. Route riêng hỗ trợ deep-link, refresh, lịch sử trình duyệt và redirect đăng nhập rõ ràng hơn modal hoặc toggle state trong cùng component.

### 2. Trang chi tiết chỉ chứa thông tin và CTA

Trang chi tiết hiển thị tiêu đề, mô tả, nghệ sĩ, ngày giờ, địa điểm, Artist Bio đã publish và CTA `Đặt vé`. Trang này không render `SeatMap`, chọn loại vé, số lượng, waiting room, payment hoặc lịch sử đơn hàng. CTA dùng `Link` đến route booking để hoạt động không phụ thuộc JavaScript handler tùy chỉnh.

### 3. Di chuyển luồng hiện tại sang booking route

Logic booking hiện có được bảo toàn tại `concert/[id]/booking/page.tsx`. Phần giới thiệu dài được bỏ khỏi booking để màn hình tập trung vào chọn vé và thanh toán; chỉ giữ header ngắn với tên concert cùng liên kết quay về trang thông tin.

### 4. Redirect đăng nhập trở lại booking

Mọi redirect đăng nhập được tạo từ booking SHALL dùng `/concert/[id]/booking` làm `redirect`. Sau khi xác thực, khán giả quay lại đúng bước giao dịch thay vì bị trả về trang thông tin.

### 5. Hai route cùng dùng contract concert hiện tại

Cả hai route gọi `fetchConcertById` với `cache: no-store`. Điều này tránh tạo cache/state chia sẻ mới và đảm bảo booking đọc tồn vé mới nhất. Artist Bio tiếp tục chỉ lấy từ field `artistBio` công khai.

## Risks / Trade-offs

- **Tăng một lần tải dữ liệu khi chuyển từ detail sang booking** → Chấp nhận để giữ route độc lập và tồn vé mới nhất; response concert hiện nhỏ.
- **Logic booking lớn vẫn nằm trong một page component** → Giữ nguyên để giới hạn phạm vi; refactor module hóa sẽ là change riêng.
- **Deep-link cũ `/concert/:id` không mở checkout ngay** → Đây là thay đổi UX chủ đích; CTA rõ ràng cung cấp đường đi mới.
- **Người dùng chưa đăng nhập mở booking trực tiếp** → Cho phép xem loại vé; chỉ yêu cầu đăng nhập khi giữ vé như hành vi hiện tại.

## Migration Plan

1. Chuyển implementation booking hiện tại sang route `/concert/[id]/booking`.
2. Tạo lại `/concert/[id]` dưới dạng trang thông tin và CTA.
3. Cập nhật back-link và login redirect trong booking.
4. Build và kiểm tra hai route trên desktop/mobile.
5. Rollback bằng cách đưa booking page trở lại `/concert/[id]` và xóa route con.

## Open Questions

Không có. Route và phạm vi nội dung của hai bước đã được xác định.
