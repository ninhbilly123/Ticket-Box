## Context

Trang `frontend/app/(public)/concert/[id]/page.tsx` hiện hiển thị tên concert, mô tả, nghệ sĩ, thời gian, địa điểm, sơ đồ khu vực và luồng mua vé. Backend `GET /api/v1/concerts/:id` đã trả `artistBio` là nội dung `publishedBio` mới nhất hoặc `null`, nhưng interface `Concert` của frontend chưa phản ánh field này.

Đây là thay đổi nhỏ ở customer frontend nhưng cần quyết định rõ vị trí, trạng thái không có dữ liệu và cách render nội dung AI đã được duyệt để tránh lộ bio nháp hoặc tạo rủi ro XSS.

## Goals / Non-Goals

**Goals:**

- Đồng bộ type `Concert` với response backend.
- Hiển thị Artist Bio đã publish dễ đọc trên trang chi tiết concert.
- Giữ nguyên xuống dòng, xử lý từ dài và hoạt động tốt trên desktop/mobile.
- Không tạo khoảng trống hoặc empty state không cần thiết khi chưa có bio.

**Non-Goals:**

- Không cho khán giả xem trạng thái xử lý, generated bio, reviewed bio hoặc lỗi AI.
- Không thêm API, polling, database migration hoặc logic publish.
- Không thay đổi trang danh sách concert hoặc admin frontend.
- Không render Markdown/HTML tùy ý từ nội dung bio.

## Decisions

### 1. Dùng field nullable trong response concert hiện có

Thêm `artistBio: string | null` vào interface `Concert` và sử dụng dữ liệu từ `fetchConcertById`. Không gọi endpoint AI quản trị vì endpoint đó yêu cầu role `ORGANIZER` và trả cả dữ liệu nội bộ không phù hợp cho khán giả.

### 2. Đặt section sau thông tin tổng quan và trước SeatMap

Artist Bio thuộc nội dung giới thiệu concert, vì vậy section nằm trong cột nội dung chính `lg:col-span-7`, ngay sau card tên/mô tả/thời gian/địa điểm và trước `SeatMap`. Vị trí này giúp khán giả đọc thông tin nghệ sĩ trước khi chọn khu vực vé mà không chen vào checkout panel.

### 3. Chỉ render khi nội dung có ý nghĩa

Điều kiện render dùng `concert.artistBio?.trim()`. `null`, chuỗi rỗng hoặc chuỗi chỉ có khoảng trắng đều không tạo section. Frontend không hiển thị placeholder “chưa có bio”, vì bio là nội dung bổ sung chứ không phải dữ liệu bắt buộc để mua vé.

### 4. Render plain text, không dùng HTML injection

Bio được render trực tiếp trong JSX với `whitespace-pre-line`, `break-words` và line-height phù hợp. Không dùng `dangerouslySetInnerHTML`; cách này giữ xuống dòng nhưng vẫn escape nội dung, giảm rủi ro XSS nếu dữ liệu bị sai nguồn.

### 5. Tái sử dụng visual language của trang bán vé

Section dùng card nền `gray-900`, viền `gray-800`, heading trắng, body `gray-300/400`, icon Lucide màu indigo và cùng bán kính/khoảng cách với card thông tin concert hiện tại. Heading dùng cấp `h2`; không thêm hero, animation hoặc component marketing.

## Risks / Trade-offs

- **Bio quá dài làm trang chi tiết dài hơn** → Dùng typography đọc dài và hiển thị đầy đủ; chưa thêm collapse vì bio do AI tạo được giới hạn ngắn và nội dung không nên bị che mặc định.
- **Nội dung chứa HTML hoặc script** → Render text JSX, tuyệt đối không dùng HTML injection.
- **API cũ không có field `artistBio`** → Field nullable và điều kiện optional chaining giúp UI tương thích ngược, không crash.
- **Từ hoặc URL rất dài gây tràn mobile** → Dùng `break-words` và kiểm tra viewport mobile.

## Migration Plan

1. Cập nhật interface `Concert`.
2. Thêm section có điều kiện vào concert detail.
3. Build frontend và kiểm tra hai trường hợp có/không có bio trên desktop/mobile.
4. Rollback bằng cách bỏ field type và section; backend không cần thay đổi.

## Open Questions

Không có. Backend contract và vị trí hiển thị đã đủ rõ cho phạm vi này.
