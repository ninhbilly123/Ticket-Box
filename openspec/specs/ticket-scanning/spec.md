# Ticket Scanning

## Purpose
TBD

## Requirements

### Requirement: Quét và xác thực mã QR của vé
Hệ thống SHALL cung cấp một API endpoint để xác thực mã QR token khi quét và cập nhật trạng thái check-in của vé.

#### Scenario: Quét vé hợp lệ
- **WHEN** một mã QR token hợp lệ và chưa qua sử dụng được gửi lên để quét
- **THEN** hệ thống SHALL cập nhật trạng thái của vé thành "đã check-in"
- **AND** hệ thống SHALL trả về phản hồi thành công cùng với thông tin chi tiết của vé

#### Scenario: Quét vé không hợp lệ
- **WHEN** một mã QR token không hợp lệ hoặc bị làm giả được gửi lên để quét
- **THEN** hệ thống SHALL từ chối yêu cầu
- **AND** hệ thống SHALL trả về lỗi "Vé không hợp lệ"

#### Scenario: Quét vé trùng lặp
- **WHEN** một mã QR token hợp lệ nhưng đã được check-in trước đó được gửi lên
- **THEN** hệ thống SHALL từ chối yêu cầu
- **AND** hệ thống SHALL trả về lỗi "Vé đã được sử dụng"
