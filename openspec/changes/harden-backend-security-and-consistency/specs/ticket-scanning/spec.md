## MODIFIED Requirements

### Requirement: Quét và xác thực mã QR của vé
Hệ thống SHALL ghi nhận check-in vé thường bằng thao tác atomic để một vé chỉ có một lượt check-in thành công, kể cả khi nhiều thiết bị gửi cùng lúc.

#### Scenario: Hai request quét cùng một vé đồng thời
- **WHEN** hai request hợp lệ cùng quét một QR chưa dùng
- **THEN** chỉ một request SHALL trả `VALID`
- **AND** request còn lại SHALL trả `ALREADY_USED`
- **AND** chỉ một check-in log thành công được ghi nhận.
