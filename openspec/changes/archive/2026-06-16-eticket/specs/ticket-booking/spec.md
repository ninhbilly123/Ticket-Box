## ADDED Requirements

### Requirement: Cập nhật trạng thái vé sau thanh toán
Hệ thống SHALL cập nhật trạng thái đặt vé thành công và kích hoạt quy trình tạo e-ticket ngay khi thanh toán được xác minh.

#### Scenario: Nhận thông báo thanh toán thành công
- **WHEN** cổng thanh toán xác nhận một đơn đặt vé đã được thanh toán thành công
- **THEN** trạng thái của đơn đặt vé SHALL chuyển sang "Đã thanh toán"
- **AND** quy trình sinh vé điện tử (e-ticket) SHALL được gọi thực thi
