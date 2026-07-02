# Concert Listing Specification

## Purpose

Quy định việc tìm kiếm, hiển thị thông tin concert, định danh bằng eventCode và luồng hai bước từ xem chi tiết đến đặt vé.

## Requirements

### Requirement: Hiển thị danh sách concert sắp diễn ra
Hệ thống SHALL hiển thị danh sách các concert có ngày diễn ra trong tương lai cùng tên concert, nghệ sĩ, địa điểm, ngày giờ và số lượng vé còn lại theo từng loại vé.

#### Scenario: Truy cập trang danh sách concert thành công
- **WHEN** khán giả truy cập trang danh sách concert sắp diễn ra
- **THEN** hệ thống SHALL hiển thị các concert hợp lệ cùng số vé còn lại
- **AND** dữ liệu tồn vé SHALL được lấy từ Redis Cache hoặc PostgreSQL khi cache trống, sau đó cache với TTL 30 giây

### Requirement: Tìm kiếm và lọc danh sách concert
Hệ thống SHALL cho phép khán giả tìm kiếm concert theo tên/nghệ sĩ và lọc theo ngày diễn ra hoặc địa điểm tổ chức.

#### Scenario: Tìm kiếm concert theo nghệ sĩ biểu diễn
- **WHEN** khán giả nhập tên nghệ sĩ vào ô tìm kiếm
- **THEN** hệ thống SHALL chỉ hiển thị các concert phù hợp với nghệ sĩ đó

#### Scenario: Lọc concert theo địa điểm tổ chức
- **WHEN** khán giả chọn một địa điểm từ bộ lọc
- **THEN** hệ thống SHALL chỉ hiển thị các concert tổ chức tại địa điểm đó

### Requirement: Định danh concert bằng event code duy nhất
Hệ thống SHALL lưu một `eventCode` duy nhất cho mỗi concert để các tích hợp bên ngoài tham chiếu đến đúng sự kiện.

#### Scenario: Tạo concert với event code hợp lệ
- **WHEN** ban tổ chức tạo hoặc cập nhật concert với một `eventCode` chưa tồn tại
- **THEN** hệ thống SHALL lưu `eventCode` cho concert
- **AND** hệ thống SHALL đảm bảo không có concert khác dùng cùng mã

#### Scenario: Event code bị trùng
- **WHEN** ban tổ chức tạo hoặc cập nhật concert với `eventCode` đã tồn tại ở concert khác
- **THEN** hệ thống SHALL từ chối yêu cầu
- **AND** hệ thống SHALL trả lỗi cho biết mã sự kiện đã được sử dụng

### Requirement: Hiển thị Artist Bio đã publish trên trang chi tiết concert
Hệ thống SHALL chỉ hiển thị Artist Bio cho khán giả khi API chi tiết concert trả nội dung đã được ban tổ chức duyệt và publish. Artist Bio SHALL là nội dung giới thiệu bổ sung, không thay thế mô tả concert và không ảnh hưởng luồng mua vé.

#### Scenario: Concert có Artist Bio đã publish
- **WHEN** khán giả truy cập trang chi tiết concert và `artistBio` có nội dung sau khi trim
- **THEN** customer frontend SHALL hiển thị section `Giới thiệu nghệ sĩ`
- **AND** section SHALL nằm sau khối thông tin tổng quan trên trang chi tiết concert
- **AND** section SHALL hiển thị đúng nội dung bio đã publish

#### Scenario: Concert chưa có Artist Bio được publish
- **WHEN** `artistBio` là `null`, không tồn tại, rỗng hoặc chỉ chứa khoảng trắng
- **THEN** customer frontend SHALL không render section Artist Bio
- **AND** frontend SHALL không hiển thị bio nháp, trạng thái xử lý, lỗi AI hoặc placeholder
- **AND** bố cục và CTA đặt vé SHALL hoạt động như trước

#### Scenario: Bio có nhiều đoạn văn
- **WHEN** `artistBio` chứa ký tự xuống dòng giữa các đoạn
- **THEN** frontend SHALL giữ cấu trúc xuống dòng để nội dung dễ đọc
- **AND** frontend SHALL không diễn giải nội dung bio như HTML thực thi

#### Scenario: Bio chứa nội dung dài trên mobile
- **WHEN** khán giả xem Artist Bio trên mobile hoặc nội dung có từ dài
- **THEN** section SHALL thích ứng chiều rộng màn hình mà không gây tràn ngang
- **AND** văn bản SHALL không che heading, CTA đặt vé hoặc nội dung tiếp theo

#### Scenario: Làm mới dữ liệu sau khi bio được publish
- **WHEN** API chi tiết concert trả Artist Bio mới sau một lần tải hoặc refresh
- **THEN** frontend SHALL hiển thị nội dung từ cùng response concert
- **AND** frontend SHALL không gọi endpoint AI quản trị hoặc yêu cầu khán giả đăng nhập

### Requirement: Artist Bio sử dụng style của trang bán vé
Section Artist Bio SHALL sử dụng typography, màu sắc, icon, border, spacing và responsive convention hiện có của trang chi tiết concert.

#### Scenario: Hiển thị trên desktop
- **WHEN** Artist Bio xuất hiện trên desktop
- **THEN** section SHALL nằm trong cột nội dung chính và không đẩy vùng CTA đặt vé ra khỏi grid
- **AND** heading và body SHALL có độ tương phản phù hợp với nền tối

#### Scenario: Hiển thị trên mobile
- **WHEN** Artist Bio xuất hiện trên mobile
- **THEN** section SHALL chiếm chiều rộng khả dụng giống các section concert khác
- **AND** padding, heading và nội dung SHALL không chồng lấn hoặc bị cắt

### Requirement: Luồng xem concert và đặt vé được tách thành hai bước
Hệ thống SHALL hiển thị thông tin concert trước khi khán giả chủ động chuyển sang màn hình đặt vé. Trang thông tin concert và trang booking SHALL có route riêng nhưng cùng tham chiếu đúng concert.

#### Scenario: Mở concert từ danh sách
- **WHEN** khán giả chọn một concert từ trang danh sách
- **THEN** hệ thống SHALL mở `/concert/:id`
- **AND** trang SHALL hiển thị tên, mô tả, nghệ sĩ, ngày giờ, địa điểm và Artist Bio đã publish khi có
- **AND** trang SHALL không render SeatMap, chọn loại vé, số lượng, waiting room, giữ vé, thanh toán hoặc lịch sử đơn hàng

#### Scenario: Chuyển từ thông tin concert sang đặt vé
- **WHEN** khán giả bấm CTA `Đặt vé` trên `/concert/:id`
- **THEN** hệ thống SHALL điều hướng đến `/concert/:id/booking`
- **AND** route booking SHALL giữ nguyên concert ID đã chọn
- **AND** trang booking SHALL hiển thị các control chọn vé và giao dịch

#### Scenario: Truy cập trực tiếp route booking
- **WHEN** khán giả mở trực tiếp hoặc refresh `/concert/:id/booking`
- **THEN** hệ thống SHALL tải concert theo ID trên route
- **AND** SHALL cho phép tiếp tục booking theo quy tắc xác thực và tồn vé hiện có

#### Scenario: Quay lại thông tin concert
- **WHEN** khán giả bấm liên kết quay lại trên trang booking
- **THEN** hệ thống SHALL điều hướng về `/concert/:id`
- **AND** SHALL không chuyển sang concert khác hoặc trang danh sách

### Requirement: Trang thông tin concert có CTA đặt vé rõ ràng
Trang thông tin concert SHALL cung cấp CTA `Đặt vé` dễ nhận biết, phù hợp style hiện tại và không che hoặc cạnh tranh với nội dung concert.

#### Scenario: CTA trên desktop
- **WHEN** trang thông tin concert hiển thị trên desktop
- **THEN** CTA SHALL xuất hiện trong vùng hành động riêng bên cạnh hoặc sau nội dung chính
- **AND** ngày giờ, địa điểm và Artist Bio SHALL có thể đọc trước khi bắt đầu giao dịch

#### Scenario: CTA trên mobile
- **WHEN** trang thông tin concert hiển thị trên mobile
- **THEN** CTA SHALL nằm trong luồng dọc và chiếm chiều rộng khả dụng
- **AND** nội dung, CTA và Artist Bio SHALL không chồng lấn hoặc gây tràn ngang

### Requirement: Booking giữ nguyên nghiệp vụ hiện có
Việc tách route SHALL không thay đổi quy tắc chọn loại vé, số lượng, waiting room, giữ vé, thanh toán, e-ticket hoặc lịch sử đơn hàng.

#### Scenario: Đăng nhập từ trang booking
- **WHEN** khán giả chưa đăng nhập bắt đầu thao tác cần xác thực tại `/concert/:id/booking`
- **THEN** hệ thống SHALL chuyển đến trang đăng nhập với redirect trỏ về `/concert/:id/booking`
- **AND** sau khi đăng nhập khán giả SHALL trở lại đúng concert và bước booking

#### Scenario: Hoàn tất giao dịch trên route mới
- **WHEN** khán giả giữ vé và thanh toán trên `/concert/:id/booking`
- **THEN** hệ thống SHALL sử dụng các API và quy tắc nghiệp vụ hiện có
- **AND** SHALL hiển thị trạng thái order và e-ticket như trước khi tách route
