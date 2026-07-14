## ADDED Requirements

### Requirement: Atomic Redis Idempotency Lock
Hệ thống SHALL dùng Redis atomic lock cho idempotency key để tránh nhiều request cùng key cùng được xử lý.

#### Scenario: Hai request cùng Idempotency-Key đến đồng thời
- **WHEN** request đầu tiên đặt được lock idempotency
- **THEN** request thứ hai SHALL nhận `409 IDEMPOTENCY_CONFLICT`
- **AND** chỉ một request được thực thi nghiệp vụ chính.

### Requirement: Redis Queue Configuration Uses Full REDIS_URL
BullMQ SHALL đọc đầy đủ cấu hình Redis từ `REDIS_URL`, bao gồm host, port, username, password, database và TLS khi có.

#### Scenario: Redis URL có password
- **WHEN** `REDIS_URL` chứa thông tin xác thực
- **THEN** BullMQ queues và workers SHALL kết nối bằng đúng credential đó.
