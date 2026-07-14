## ADDED Requirements

### Requirement: Concert Reminder Email
Hệ thống SHALL gửi email nhắc lịch cho người có vé hợp lệ trước thời điểm diễn ra concert khoảng 24 giờ.

#### Scenario: Gửi reminder trước concert
- **WHEN** một concert sắp diễn ra trong cửa sổ nhắc 24 giờ
- **AND** user có ít nhất một vé `valid` thuộc order đã thanh toán cho concert đó
- **THEN** hệ thống SHALL gửi email nhắc lịch cho user
- **AND** hệ thống SHALL tạo notification type `concert_reminder_24h`.

#### Scenario: Không gửi reminder trùng
- **WHEN** hệ thống đã có notification email type `concert_reminder_24h` cho cùng user và concert
- **THEN** reminder worker SHALL skip user đó
- **AND** hệ thống SHALL NOT gửi email reminder lần thứ hai.
