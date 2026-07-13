## MODIFIED Requirements

### Requirement: Quet va xac thuc ma QR cua ve
He thong SHALL cung cap API check-in bao ve bang JWT/RBAC de Android Scanner App gui QR token, xac thuc ve va cap nhat trang thai check-in.

#### Scenario: Quet ve tu Android Scanner App hop le
- **WHEN** Android Scanner App gui mot QR token hop le cua ve chua dung kem JWT role `CHECKIN_STAFF`
- **AND** nhan vien duoc phan cong dung concert/gate
- **THEN** backend SHALL cap nhat ve thanh da check-in
- **AND** backend SHALL tra ket qua `VALID` cung thong tin loai ve.

#### Scenario: Quet ve tu staff khong duoc phan cong
- **WHEN** Android Scanner App gui QR token cho concert/gate ma nhan vien khong duoc phan cong
- **THEN** backend SHALL tu choi request voi loi phan quyen
- **AND** backend SHALL khong cap nhat trang thai ve.

#### Scenario: Dong bo luot quet offline
- **WHEN** Android Scanner App gui danh sach luot quet offline theo thu tu thoi gian
- **THEN** backend SHALL xu ly tung luot theo quy tac First-Scan Wins
- **AND** backend SHALL tra danh sach conflict cho cac luot khong the dong bo thanh cong.

## ADDED Requirements

### Requirement: Scanner Client Boundary
He thong SHALL coi Android Scanner App la client chinh cho thao tac quet tai cong, con admin web la client quan ly va giam sat.

#### Scenario: Nhan vien can quet tai cong
- **WHEN** nhan vien soat ve bat dau ca lam
- **THEN** nhan vien SHALL dung Android Scanner App tren dien thoai de quet QR
- **AND** admin web SHALL khong la luong van hanh chinh cho camera scanning tai cong.
