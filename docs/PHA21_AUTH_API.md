# PHA 21 — Auth API (local/staging, no DB migration)

- POST /auth/login {username,password} -> set HttpOnly Secure cookie vanlang_session=account_id (DATA_MODE=mock)
- GET /auth/me -> {account_id, username} | 401
- Thành công: dùng cùng flow với frontend auth.service.js khi DATA_MODE=api (đổi API_URL)
- Register CHƯA implement (cần email column -> Safety Gate)
- Không migration, không đổi packet, không restart game
- Staging: set VANLANG_DB_* env khi có DB thật
