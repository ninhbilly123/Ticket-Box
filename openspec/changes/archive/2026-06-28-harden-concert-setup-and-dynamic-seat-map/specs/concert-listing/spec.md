## ADDED Requirements

### Requirement: Contract concert công khai cung cấp cấu hình sơ đồ theo concert
API chi tiết concert SHALL trả trạng thái sử dụng sơ đồ và nội dung SVG đã làm sạch của đúng concert để customer frontend không dùng sơ đồ gán cứng.

#### Scenario: Concert sử dụng sơ đồ khu vực
- **WHEN** khán giả tải chi tiết một concert đã publish có `seatMapEnabled = true`
- **THEN** API SHALL trả `seatMapEnabled = true` và `seatMapSvg` của concert đó
- **AND** mỗi loại vé SHALL có `zoneCode`

#### Scenario: Concert không sử dụng sơ đồ
- **WHEN** khán giả tải chi tiết concert có `seatMapEnabled = false`
- **THEN** API SHALL trả `seatMapEnabled = false`
- **AND** customer frontend SHALL vẫn có đủ danh sách loại vé để tiếp tục booking

### Requirement: Chỉ công khai concert đã vượt qua readiness
Concert chỉ SHALL chuyển sang trạng thái công khai thông qua endpoint publish có readiness check.

#### Scenario: Bản nháp cấu hình thiếu
- **WHEN** concert còn `DRAFT` hoặc publish bị từ chối vì readiness không đạt
- **THEN** API danh sách và chi tiết công khai SHALL không trả concert đó
