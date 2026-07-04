## MODIFIED Requirements

### Requirement: Quét E-Ticket của khách mời VIP
Hệ thống SHALL cho phép nhân sự soát vé xác thực QR e-ticket của khách mời VIP cả trong luồng online scan và offline sync.

#### Scenario: Đồng bộ offline QR VIP hợp lệ
- **WHEN** Scanner App đồng bộ một QR token VIP hợp lệ đã quét offline
- **THEN** backend SHALL cập nhật khách mời VIP thành đã check-in
- **AND** sync response SHALL tăng `syncedCount`
- **AND** backend SHALL NOT trả conflict `INVALID_TICKET` cho QR VIP hợp lệ.

#### Scenario: Đồng bộ offline QR VIP đã dùng
- **WHEN** Scanner App đồng bộ một QR token VIP đã check-in trước đó
- **THEN** backend SHALL trả conflict cho lượt quét đó
- **AND** conflict reason SHALL cho biết vé/khách mời đã được sử dụng.
