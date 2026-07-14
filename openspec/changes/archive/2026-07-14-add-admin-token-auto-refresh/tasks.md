## 1. Admin API client

- [x] 1.1 Thêm session storage helpers dùng chung cho admin frontend.
- [x] 1.2 Thêm API gọi `/auth/refresh`.
- [x] 1.3 Tự refresh khi JSON request trả `AUTH_TOKEN_EXPIRED`.
- [x] 1.4 Tự refresh khi multipart request trả `AUTH_TOKEN_EXPIRED`.
- [x] 1.5 Chống nhiều refresh song song bằng shared refresh promise.

## 2. Admin page state

- [x] 2.1 Dùng session storage key chung từ API client.
- [x] 2.2 Lắng nghe event session refreshed/cleared để cập nhật React state.
- [x] 2.3 Giữ hành vi logout hiện tại.

## 3. Verification

- [x] 3.1 Chạy OpenSpec validation.
- [x] 3.2 Build admin frontend.
- [x] 3.3 Build backend để đảm bảo auth API vẫn ổn.
