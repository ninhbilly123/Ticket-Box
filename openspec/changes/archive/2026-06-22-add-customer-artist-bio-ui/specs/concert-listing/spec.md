## MODIFIED Requirements

### Requirement: Hiển thị Artist Bio đã publish trên trang chi tiết concert
Hệ thống SHALL chỉ hiển thị Artist Bio cho khán giả khi API chi tiết concert trả về nội dung bio đã được ban tổ chức duyệt và publish. Artist Bio SHALL được trình bày như nội dung giới thiệu bổ sung, không thay thế mô tả concert và không ảnh hưởng luồng mua vé.

#### Scenario: Concert có Artist Bio đã publish
- **WHEN** khán giả truy cập trang chi tiết concert và API trả `artistBio` có nội dung sau khi trim
- **THEN** customer frontend SHALL hiển thị section `Giới thiệu nghệ sĩ`
- **AND** section SHALL nằm sau khối thông tin tổng quan concert và trước khu vực chọn vé/SeatMap
- **AND** section SHALL hiển thị đúng nội dung bio đã publish

#### Scenario: Concert chưa có Artist Bio được publish
- **WHEN** API trả `artistBio` là `null`, không tồn tại, chuỗi rỗng hoặc chỉ chứa khoảng trắng
- **THEN** customer frontend SHALL không render section Artist Bio
- **AND** frontend SHALL không hiển thị bio nháp, bio đang xử lý, bio bị lỗi hoặc placeholder cho khán giả
- **AND** bố cục và luồng mua vé SHALL hoạt động như trước

#### Scenario: Bio có nhiều đoạn văn
- **WHEN** `artistBio` chứa ký tự xuống dòng giữa các đoạn
- **THEN** frontend SHALL giữ cấu trúc xuống dòng để nội dung dễ đọc
- **AND** frontend SHALL không diễn giải nội dung bio như HTML thực thi

#### Scenario: Bio chứa nội dung dài trên mobile
- **WHEN** khán giả xem Artist Bio trên viewport mobile hoặc nội dung có từ dài
- **THEN** section SHALL chuyển theo chiều rộng màn hình mà không gây tràn ngang trang
- **AND** văn bản SHALL xuống dòng, không che heading, SeatMap hoặc khu vực đặt vé

#### Scenario: Khán giả làm mới dữ liệu concert sau khi bio được publish
- **WHEN** API chi tiết concert trả Artist Bio đã publish sau một lần tải hoặc refresh dữ liệu
- **THEN** frontend SHALL hiển thị nội dung mới từ cùng response concert
- **AND** frontend SHALL không cần gọi endpoint AI quản trị hoặc yêu cầu khán giả đăng nhập

### Requirement: Artist Bio sử dụng style của trang bán vé
Section Artist Bio SHALL sử dụng typography, màu sắc, icon, border, spacing và responsive convention hiện có của trang chi tiết concert.

#### Scenario: Hiển thị trên desktop
- **WHEN** Artist Bio xuất hiện trên viewport desktop
- **THEN** section SHALL nằm trong cột nội dung chính và không đẩy checkout panel ra khỏi grid
- **AND** heading và body SHALL có độ tương phản phù hợp với nền tối hiện tại

#### Scenario: Hiển thị trên mobile
- **WHEN** Artist Bio xuất hiện trên viewport mobile
- **THEN** section SHALL chiếm chiều rộng khả dụng giống các section concert khác
- **AND** padding, heading và nội dung SHALL không chồng lấn hoặc bị cắt
