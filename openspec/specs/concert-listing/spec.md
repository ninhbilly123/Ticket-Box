# Concert Listing

## Purpose
TBD

## Requirements

### Requirement: Hiển thị danh sách concert sắp diễn ra
Hệ thống SHALL hiển thị danh sách các concert có ngày diễn ra trong tương lai. Đối với mỗi concert, hệ thống SHALL hiển thị các thông tin bao gồm: tên concert, nghệ sĩ biểu diễn, địa điểm tổ chức, ngày giờ diễn ra, và số lượng vé còn lại theo thời gian thực (real-time) đối với từng loại vé (ví dụ: GA, VIP, SVIP...).

#### Scenario: Truy cập trang danh sách concert thành công
- **WHEN** Khán giả truy cập vào trang danh sách concert sắp diễn ra
- **THEN** Hệ thống SHALL truy vấn và hiển thị danh sách các concert hợp lệ kèm theo số lượng vé còn lại của từng phân hạng vé từ Redis Cache. Nếu Redis Cache trống, hệ thống SHALL truy vấn PostgreSQL, cập nhật vào cache với TTL 30 giây rồi hiển thị cho người dùng.

### Requirement: Tìm kiếm và lọc danh sách concert
Hệ thống SHALL cho phép khán giả tìm kiếm concert theo tên/nghệ sĩ và lọc danh sách theo ngày diễn ra và địa điểm tổ chức.

#### Scenario: Tìm kiếm concert theo nghệ sĩ biểu diễn
- **WHEN** Khán giả nhập tên nghệ sĩ "Sơn Tùng M-TP" vào ô tìm kiếm và nhấn tìm kiếm
- **THEN** Hệ thống SHALL lọc và hiển thị danh sách các concert có sự tham gia của nghệ sĩ "Sơn Tùng M-TP".

#### Scenario: Lọc concert theo địa điểm tổ chức
- **WHEN** Khán giả chọn địa điểm "Hồ Chí Minh" từ bộ lọc địa điểm
- **THEN** Hệ thống SHALL lọc và chỉ hiển thị các concert tổ chức tại Hồ Chí Minh.
