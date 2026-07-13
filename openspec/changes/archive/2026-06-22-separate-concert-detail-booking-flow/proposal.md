## Why

Trang chi tiết concert hiện trộn nội dung giới thiệu với chọn vé, giữ vé và thanh toán ngay trong cùng một màn hình, khiến khán giả chưa kịp xem thông tin sự kiện đã phải đối diện với giao diện giao dịch phức tạp. Luồng cần được tách thành bước tìm hiểu concert trước và bước đặt vé chỉ xuất hiện sau khi khán giả chủ động chọn `Đặt vé`.

## What Changes

- Giữ `/concert/:id` làm trang thông tin concert, ưu tiên tên, mô tả, nghệ sĩ, ngày giờ, địa điểm và Artist Bio đã publish.
- Thêm CTA `Đặt vé` rõ ràng trên trang thông tin concert.
- Thêm route `/concert/:id/booking` dành riêng cho chọn khu vực/loại vé, số lượng, waiting room, giữ vé, thanh toán và lịch sử đơn hàng.
- Điều chỉnh các liên kết quay lại và redirect đăng nhập để người dùng trở về đúng bước trong luồng.
- Giữ nguyên API backend, quy tắc Artist Bio, cơ chế giữ vé và thanh toán hiện có.

## Capabilities

### New Capabilities

Không có.

### Modified Capabilities

- `concert-listing`: Bổ sung luồng hai bước giữa trang thông tin concert và trang đặt vé chuyên biệt.

## Impact

- `frontend/app/(public)/concert/[id]/page.tsx`: trở thành màn hình thông tin concert và CTA đặt vé.
- `frontend/app/(public)/concert/[id]/booking/page.tsx`: chứa luồng booking được tách từ trang chi tiết hiện tại.
- Điều hướng đăng nhập và liên kết quay lại trong customer frontend.
- Không thêm endpoint, migration, dependency hoặc thay đổi backend.
