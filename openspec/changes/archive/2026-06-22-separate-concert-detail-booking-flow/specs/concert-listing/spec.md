## ADDED Requirements

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
- **AND** SHALL cho phép tiếp tục luồng booking theo quy tắc xác thực và tồn vé hiện có

#### Scenario: Quay lại thông tin concert
- **WHEN** khán giả bấm liên kết quay lại trên trang booking
- **THEN** hệ thống SHALL điều hướng về `/concert/:id`
- **AND** SHALL không chuyển sang concert khác hoặc trang danh sách

### Requirement: Trang thông tin concert có CTA đặt vé rõ ràng
Trang thông tin concert SHALL cung cấp CTA `Đặt vé` dễ nhận biết, phù hợp style hiện tại và không che hoặc cạnh tranh với nội dung concert.

#### Scenario: CTA trên desktop
- **WHEN** trang thông tin concert được hiển thị trên desktop
- **THEN** CTA SHALL xuất hiện trong vùng hành động riêng bên cạnh hoặc sau nội dung chính
- **AND** ngày giờ, địa điểm và Artist Bio SHALL có thể đọc trước khi bắt đầu giao dịch

#### Scenario: CTA trên mobile
- **WHEN** trang thông tin concert được hiển thị trên mobile
- **THEN** CTA SHALL nằm trong luồng dọc và chiếm chiều rộng khả dụng
- **AND** nội dung, CTA và Artist Bio SHALL không chồng lấn hoặc gây tràn ngang

### Requirement: Booking giữ nguyên nghiệp vụ hiện có
Việc tách route SHALL không thay đổi quy tắc chọn loại vé, số lượng, waiting room, giữ vé, thanh toán, e-ticket hoặc lịch sử đơn hàng.

#### Scenario: Đăng nhập từ trang booking
- **WHEN** khán giả chưa đăng nhập bắt đầu thao tác cần xác thực tại `/concert/:id/booking`
- **THEN** hệ thống SHALL chuyển đến trang đăng nhập với redirect trỏ về `/concert/:id/booking`
- **AND** sau khi đăng nhập khán giả SHALL trở lại đúng concert và bước booking

#### Scenario: Hoàn tất giao dịch trên route mới
- **WHEN** khán giả thực hiện giữ vé và thanh toán trên `/concert/:id/booking`
- **THEN** hệ thống SHALL sử dụng các API và quy tắc nghiệp vụ hiện có
- **AND** SHALL hiển thị trạng thái order và e-ticket như trước khi tách route
