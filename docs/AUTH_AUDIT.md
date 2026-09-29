# PHA 20 — AUTH AUDIT (READ-ONLY) — 2026-09-30

> Audit hệ account game hiện tại để nối TRANGCHU -> GAME ACCOUNT THẬT (1 USER = 1 account_id), không tạo account thứ hai. KHÔNG sửa DB/packet/server trong PHA 20.

## ACCOUNT TABLE
v1_account — server-java/db/schema/001_core.sql (ENGINE=InnoDB utf8mb4, MariaDB 11.4)

## ACCOUNT PK
id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY

## USERNAME FIELD
username VARCHAR(32) UNIQUE (uq_account_username) — 3..16 [A-Za-z0-9_.]

## EMAIL FIELD
KHÔNG có cột email trong v1_account hiện tại (không cần cho login; register web cần thêm nhưng thuộc Safety Gate)

## PASSWORD STORAGE
password_hash VARCHAR(255) (ck_account_hash_len >= 20), hash_algorithm VARCHAR(32) default 'bcrypt' — cấm plaintext/md5/sha1

## PASSWORD VERIFY CODE
server/security/PasswordHasher.java — BCrypt.VERSION_2Y cost 10, BCrypt.verifyer() (tương thích $2a/$2b/$2y), 72 bytes limit

## CHARACTER TABLE
v1_character — id PK, account_id FK -> v1_account.id CASCADE, name UNIQUE toàn server, class_id -> v1_class_map RESTRICT

## CHARACTER PK
id BIGINT UNSIGNED AUTO_INCREMENT

## ACCOUNT ↔ CHARACTER
1 account -> N characters (1:N qua account_id FK, nhiều name/class/level khác nhau)

## LOGIN CLIENT FILE
client/src/screens/login.js — gửi Cmd.REGISTER (10) / Cmd.LOGIN (12) với encodeCredentials(username,password), nhận Cmd.REGISTER_RESULT (11) / Cmd.LOGIN_RESULT (13). Cũng dùng @vanlang/protocol ws-client.js

## LOGIN PACKET
C->S: LOGIN 12 body {UTF username, UTF password}
S->C: LOGIN_RESULT 13 body {byte status, long accountId, UTF message}
Tương tự REGISTER 10/REGISTER_RESULT 11

## LOGIN SERVER HANDLER
server/net/handlers/AuthCommandsHandler.java — handle(LOGIN) { findByUsername -> PasswordHasher.verify -> markAuthenticated(accountId) -> LOGIN_RESULT }. Rate-limit NOT_READY (V0.3), generic INVALID_CREDENTIALS, không log password/hash.

## SESSION MODEL
server/net/Session.java — AtomicLong accountId (0=chưa auth), AtomicLong authenticatedCharacterId, boolean handshaken (gate -113), markAuthenticated(accountId)

## CURRENT GAME AUTH FLOW
Client connect -> handshake -113 -> REGISTER/LOGIN (10/12) -> markAuthenticated -> CHAR_LIST -> CHAR_SELECT -> ENTER_WORLD

## WEB AUTH ADAPTER POSSIBLE
YES — thêm HTTP Auth API (Node/Express) dùng chung AccountDAO/PasswordHasher logic (chung DB v1_account), không đổi game packet. Web login trả HttpOnly session, game SSO dùng short-lived launch ticket.

## SSO WITHOUT CHANGING GAME LOGIN PROTOCOL
YES — Trangchu Auth API giữ session, CHƠI NGAY xin launch ticket (TTL 30-60s, single-use, bound account_id, random) qua API, game validate ticket (adapter trong GameServer, không đổi opcode -113/12) rồi markAuthenticated như LOGIN.

## DB MIGRATION REQUIRED
NO cho PHA 20 audit và Pha 21 HTTP login (dùng v1_account hiện có). Chỉ cần thêm bảng launch_ticket nếu làm SSO ticket (Pha 22) — thuộc Safety Gate, cần duyệt trước khi CREATE TABLE production.

## NEW TABLE REQUIRED
NO bắt buộc cho login web cơ bản. Pha 22 (launch ticket) cần 1 bảng v1_launch_ticket (account_id, ticket, expires_at) hoặc Redis/memory store — cần duyệt.

## LOGIN PACKET CHANGE REQUIRED
NO — giữ Cmd 10/12 và PayloadCodec hiện tại.

## GAME RESTART REQUIRED
NO — Pha 21 HTTP service độc lập, không restart vanlang-server/gateway/mariadb.

## RECOMMENDED AUTH ARCHITECTURE
```
Browser
  -> Trangchu (vanlang-home) --fetch--> Auth API (Node, DATA_MODE=mock->api, API_URL)
                                - POST /auth/login {u,p} -> verify via AccountDAO/PasswordHasher -> set HttpOnly Secure cookie (player scope)
                                - POST /auth/logout, GET /auth/me
  -> CHƠI NGAY -> GET /auth/launch-ticket (TTL 30-60s, single-use) -> game.vanlang.biz?t=xxx
  -> Game validates ticket (lookup + expire) -> markAuthenticated(account_id) -> không login lại
Admin: separate ADMIN SESSION (abeo.vanlang.biz), không Domain=.vanlang.biz rộng.
```
CORS allowlist: https://trangchu.vanlang.biz, https://game.vanlang.biz. Rate limit login, parameterized SQL, generic error.

## COOKIE SECURITY
KHÔNG dùng Domain=.vanlang.biz rộng. Player session cookie scope cho auth/game services; ADMIN SESSION riêng cho abeo.vanlang.biz. Nếu cần cross-subdomain, dùng explicit ticket exchange (launch ticket) thay vì cookie rộng.

## SAFETY GATE ASSESSMENT
Pha 20 READ-ONLY: không chạm DB/packet/server -> PASS, không cần approval.
Pha 21 HTTP login adapter: KHÔNG migration, KHÔNG đổi packet, KHÔNG restart game -> có thể tiếp tục local/staging sau khi duyệt. Nếu thêm email column hoặc launch_ticket table -> HIT GATE, cần duyệt trước khi ALTER/CREATE production.

