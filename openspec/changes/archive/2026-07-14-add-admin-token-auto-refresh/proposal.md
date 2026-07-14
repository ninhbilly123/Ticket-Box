## Why

Admin dashboard đang dùng access token ngắn hạn. Khi ban tổ chức thao tác lâu hơn thời gian sống của access token, các API tiếp theo trả `AUTH_TOKEN_EXPIRED`/invalid token và UI hiển thị lỗi giữa phiên, dù refresh token vẫn còn hợp lệ.

Backend đã có endpoint refresh token, nhưng admin frontend chưa tự gọi refresh và retry request.

## What Changes

- Bổ sung cơ chế auto-refresh token trong admin frontend API client.
- Khi request có Bearer token bị `AUTH_TOKEN_EXPIRED`, frontend gọi `POST /api/v1/auth/refresh` bằng refresh token hiện có.
- Nếu refresh thành công, frontend lưu session mới, phát event cập nhật state, và retry request ban đầu bằng access token mới.
- Nếu refresh thất bại, frontend xóa session cũ và yêu cầu đăng nhập lại.
- Hỗ trợ cả JSON request và multipart upload request như upload seat map/AI Bio PDF.

## Impact

- Không cần đổi backend schema.
- Không cần kéo dài `JWT_ACCESS_TTL` chỉ để tránh lỗi demo.
- Admin dashboard dùng được lâu hơn trong cùng phiên nếu refresh token còn hạn.
