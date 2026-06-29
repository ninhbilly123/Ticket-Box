## MODIFIED Requirements

### Requirement: Quét và xác thực mã QR của vé
Hệ thống SHALL cung cấp API check-in bảo vệ bằng JWT/RBAC để Scanner App gửi QR token, xác thực vé và cập nhật trạng thái check-in.

#### Scenario: Quét vé từ Scanner App hợp lệ
- **WHEN** Scanner App gửi một QR token hợp lệ của vé chưa dùng kèm JWT role `CHECKIN_STAFF`
- **AND** nhân viên được phân công đúng concert/gate
- **THEN** backend SHALL cập nhật vé thành đã check-in
- **AND** backend SHALL trả kết quả `VALID` cùng thông tin loại vé.

#### Scenario: Quét vé từ staff không được phân công
- **WHEN** Scanner App gửi QR token cho concert/gate mà nhân viên không được phân công
- **THEN** backend SHALL từ chối request với lỗi phân quyền
- **AND** backend SHALL không cập nhật trạng thái vé.

#### Scenario: Đồng bộ lượt quét offline
- **WHEN** Scanner App gửi danh sách lượt quét offline theo thứ tự thời gian
- **THEN** backend SHALL xử lý từng lượt theo quy tắc First-Scan Wins
- **AND** backend SHALL trả danh sách conflict cho các lượt không thể đồng bộ thành công.

## ADDED Requirements

### Requirement: Scanner Client Boundary
Hệ thống SHALL coi Expo Scanner App là client chính cho thao tác quét tại cổng, còn admin web là client quản lý và giám sát.

#### Scenario: Nhân viên cần quét tại cổng
- **WHEN** nhân viên soát vé bắt đầu ca làm
- **THEN** nhân viên SHALL dùng Scanner App trên điện thoại để quét QR
- **AND** admin web SHALL không là luồng vận hành chính cho camera scanning tại cổng.
