## MODIFIED Requirements

### Requirement: Object-Level Authorization
Hệ thống SHALL áp dụng kiểm tra quyền theo object cho các module backend ngoài admin core, bao gồm AI Artist Bio, VIP Guest Sync, payment và order detail.

#### Scenario: Organizer thao tác AI Bio của concert ngoài tổ chức
- **WHEN** organizer gửi request AI Bio cho concert không thuộc tổ chức hoặc không do họ quản lý
- **THEN** hệ thống SHALL trả `403 FORBIDDEN_RESOURCE`.

#### Scenario: Organizer xem báo cáo VIP Sync ngoài tổ chức
- **WHEN** organizer yêu cầu import report không thuộc organization của mình
- **THEN** hệ thống SHALL trả `403 FORBIDDEN_RESOURCE`.
