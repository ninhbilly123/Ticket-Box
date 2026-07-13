## ADDED Requirements

### Requirement: Phát sự kiện thanh toán thành công
Hệ thống SHALL phát ra một sự kiện (event) nội bộ thông báo thanh toán thành công để kích hoạt các dịch vụ liên quan như tạo e-ticket.

#### Scenario: Hoàn tất thanh toán
- **WHEN** webhook của cổng thanh toán nhận được payload thông báo thanh toán thành công
- **THEN** hệ thống SHALL xử lý luồng thanh toán
- **AND** hệ thống SHALL phát sự kiện `PaymentCompleted` vào message broker/queue
