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

### Requirement: Định danh concert bằng event code duy nhất
Hệ thống SHALL lưu một mã sự kiện `eventCode` duy nhất cho mỗi concert để các tích hợp bên ngoài, đặc biệt là CSV khách mời VIP, có thể tham chiếu đến đúng concert.

#### Scenario: Tạo concert với event code hợp lệ
- **WHEN** Ban tổ chức tạo hoặc cập nhật concert với một `eventCode` chưa tồn tại
- **THEN** hệ thống SHALL lưu `eventCode` đó cho concert
- **AND** hệ thống SHALL đảm bảo không có concert khác dùng cùng `eventCode`

#### Scenario: Event code bị trùng
- **WHEN** Ban tổ chức tạo hoặc cập nhật concert với `eventCode` đã tồn tại ở concert khác
- **THEN** hệ thống SHALL từ chối yêu cầu
- **AND** hệ thống SHALL trả về lỗi cho biết mã sự kiện đã được sử dụng

### Requirement: Hiển thị Artist Bio đã publish trên trang chi tiết concert
Hệ thống SHALL chỉ hiển thị Artist Bio cho khán giả khi bio đó đã được ban tổ chức duyệt và publish.

#### Scenario: Concert có Artist Bio đã publish
- **WHEN** Khán giả truy cập trang chi tiết concert có Artist Bio trạng thái `PUBLISHED`
- **THEN** hệ thống SHALL hiển thị nội dung bio đã publish trên trang chi tiết concert

#### Scenario: Concert chưa có Artist Bio được publish
- **WHEN** Khán giả truy cập trang chi tiết concert chưa có Artist Bio trạng thái `PUBLISHED`
- **THEN** hệ thống SHALL không hiển thị bio nháp, bio đang xử lý hoặc bio bị lỗi cho khán giả

