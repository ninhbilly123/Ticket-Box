## Approach

Admin frontend giữ session trong `localStorage`. API client sẽ là nơi xử lý token expiry tập trung để không phải sửa từng màn hình.

Luồng request:

1. Component gọi `adminApi.*(token, ...)`.
2. API client đọc session mới nhất trong `localStorage`.
3. Nếu token truyền vào đã cũ hơn token trong storage, API client dùng token mới hơn.
4. Nếu backend trả `AUTH_TOKEN_EXPIRED`, API client gọi `/auth/refresh`.
5. Nếu refresh thành công:
   - ghi session mới vào `localStorage`,
   - phát browser event để React state cập nhật,
   - retry request ban đầu một lần.
6. Nếu refresh thất bại:
   - xóa session trong `localStorage`,
   - phát event để UI quay về màn hình đăng nhập,
   - throw lỗi yêu cầu đăng nhập lại.

Để tránh nhiều API cùng refresh một lúc, API client dùng một `refreshPromise` module-level. Các request gặp token hết hạn trong cùng thời điểm sẽ chờ cùng một refresh.

## Notes

- Refresh token ở backend đang rotate: token cũ bị revoke, token mới được phát hành. Vì vậy frontend phải lưu cả access token và refresh token mới.
- Multipart request cũng cần retry vì upload AI Bio/seat map có thể hết hạn token trong lúc admin thao tác.
- Nếu user đổi `JWT_SECRET` hoặc server restart với secret khác, refresh token có thể vẫn còn nhưng access token cũ invalid. Auto-refresh sẽ xử lý được nếu refresh token trong DB còn hợp lệ.
