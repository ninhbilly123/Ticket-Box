## Why

Backend đã trả `artistBio` đã publish trong API chi tiết concert, nhưng customer frontend chưa khai báo field và chưa hiển thị nội dung này. Khán giả vì vậy không xem được phần giới thiệu nghệ sĩ đã được ban tổ chức duyệt.

## What Changes

- Bổ sung `artistBio: string | null` vào contract `Concert` của customer frontend.
- Hiển thị một section giới thiệu nghệ sĩ trên trang chi tiết concert khi API trả về bio đã publish.
- Giữ nguyên định dạng đoạn văn, xuống dòng và khả năng đọc trên desktop/mobile.
- Không render section, placeholder hay nội dung nháp khi `artistBio` là `null`, rỗng hoặc chỉ chứa khoảng trắng.
- Giữ giao diện thống nhất với nền tối, typography, khoảng cách và icon hiện tại của trang bán vé.

## Capabilities

### New Capabilities

Không có.

### Modified Capabilities

- `concert-listing`: Làm rõ yêu cầu hiển thị Artist Bio đã publish trên customer concert detail, bao gồm vị trí, trạng thái không có dữ liệu, định dạng nội dung và responsive.

## Impact

- `frontend/lib/api.ts`: mở rộng type `Concert` với `artistBio` nullable.
- `frontend/app/(public)/concert/[id]/page.tsx`: render section Artist Bio trong cột thông tin concert.
- API backend `GET /api/v1/concerts/:id` đã đáp ứng contract; không cần migration hoặc endpoint mới.
- Không ảnh hưởng luồng chọn vé, giữ vé, thanh toán, waiting room hoặc trang admin.
