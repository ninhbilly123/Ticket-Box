## 1. Cập nhật hợp đồng dữ liệu frontend

- [x] 1.1 Bổ sung trường `artistBio: string | null` vào kiểu dữ liệu `Concert` của customer frontend.
- [x] 1.2 Xác nhận hàm lấy chi tiết concert giữ nguyên dữ liệu `artistBio` do backend trả về.

## 2. Hiển thị Artist Bio trên trang chi tiết concert

- [x] 2.1 Thêm khu vực Artist Bio sau phần tổng quan concert và trước sơ đồ khu vực vé.
- [x] 2.2 Chỉ hiển thị khu vực Artist Bio khi `artistBio` sau khi loại bỏ khoảng trắng không rỗng.
- [x] 2.3 Hiển thị bio dưới dạng văn bản thuần, giữ xuống dòng và ngắt từ dài để tránh tràn giao diện.
- [x] 2.4 Áp dụng heading ngữ nghĩa, icon và style tối hiện có của trang bán vé trên cả desktop và mobile.

## 3. Kiểm thử và xác nhận

- [x] 3.1 Kiểm tra concert có bio đã publish hiển thị đúng nội dung và định dạng nhiều dòng.
- [x] 3.2 Kiểm tra concert không có bio, bio `null` hoặc chỉ chứa khoảng trắng không hiển thị khu vực Artist Bio.
- [x] 3.3 Kiểm tra nội dung dài và chuỗi không có khoảng trắng không gây tràn giao diện ở desktop và mobile.
- [x] 3.4 Xác nhận frontend không gọi API quản trị AI Bio và không render nội dung bio dưới dạng HTML.
- [x] 3.5 Chạy kiểm tra build/lint hiện có của customer frontend và sửa các lỗi phát sinh từ thay đổi này.
- [x] 3.6 Chạy `openspec validate add-customer-artist-bio-ui --type change --strict` và xác nhận change hợp lệ.
