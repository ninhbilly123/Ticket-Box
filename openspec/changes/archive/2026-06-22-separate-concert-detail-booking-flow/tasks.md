## 1. Tách route booking

- [x] 1.1 Chuyển page booking hiện tại sang `concert/[id]/booking/page.tsx` và cập nhật các import tương đối.
- [x] 1.2 Cập nhật liên kết quay lại từ booking về `/concert/:id`.
- [x] 1.3 Cập nhật mọi redirect đăng nhập trong booking để trở lại `/concert/:id/booking`.
- [x] 1.4 Loại bỏ nội dung Artist Bio dài khỏi booking nhưng giữ tên concert và các control giao dịch hiện có.

## 2. Xây dựng trang thông tin concert

- [x] 2.1 Tạo lại `concert/[id]/page.tsx` để tải và xử lý loading/error cho concert.
- [x] 2.2 Hiển thị tên, mô tả, nghệ sĩ, ngày giờ, địa điểm và Artist Bio đã publish.
- [x] 2.3 Thêm CTA `Đặt vé` điều hướng đến `/concert/:id/booking`.
- [x] 2.4 Đảm bảo trang thông tin không render SeatMap, chọn loại vé, waiting room, payment hoặc lịch sử đơn hàng.
- [x] 2.5 Áp dụng style hiện tại và bố cục responsive không tràn ngang trên desktop/mobile.

## 3. Kiểm thử và xác nhận

- [x] 3.1 Kiểm tra điều hướng từ danh sách đến detail, từ detail đến booking và từ booking quay lại detail.
- [x] 3.2 Kiểm tra deep-link/refresh booking tải đúng concert và giữ nguyên luồng đặt vé.
- [x] 3.3 Kiểm tra redirect đăng nhập của booking chứa đúng return URL.
- [x] 3.4 Chạy production build của customer frontend.
- [x] 3.5 Kiểm tra trực quan detail và booking trên desktop/mobile.
- [x] 3.6 Chạy OpenSpec strict validation và xác nhận toàn bộ task hoàn thành.
