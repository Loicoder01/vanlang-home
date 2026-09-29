# MASTER PROMPT — PHA 20–25: API CONTRACT (FRONTEND READY, NO DB MIGRATION)

Mục tiêu: hoàn thiện contract để sau này chỉ đổi DATA_MODE=mock -> api là chạy thật, không viết lại frontend.

Thứ tự:
- Pha 20: Auth API contract (register/login/me/logout, DTO, error codes)
- Pha 21: Session & SSO contract (HttpOnly cookie, game.vanlang.biz verify cùng account_id)
- Pha 22: Ranking API contract (read-only, topLevel/topPower/topEquip/topBoss)
- Pha 23: Community/Chat API contract (read-only + mock write, chưa WebSocket)
- Pha 24: Game launch + account_id binding + mainCharacterId
- Pha 25: Admin read-only contract (abeo.vanlang.biz)

Mỗi pha: viết contracts/*.md -> cập nhật services/*.js với api() branch (DATA_MODE switch) -> data/*.json giữ DEMO -> node --check -> commit -> push main -> Actions -> VPS -> healthcheck.

CHỐT AN TOÀN — GẶP LÀ DỪNG, KHÔNG TỰ LÀM:
1. Bất kỳ migration / ALTER / CREATE TABLE DB
2. Thay đổi login protocol / packet / auth flow của game hiện tại
3. Ghi data thật vào MariaDB / vanlang DB
4. restart/kill vanlang-server / gateway
5. Đổi port / WebSocket game

Gặp 1 trong 5 -> DỪNG, báo NEED_USER_APPROVAL: DB_MIGRATION hoặc LOGIN_PROTOCOL_CHANGE và ghi diff đề xuất.

Config:
- DATA_MODE=mock (hiện tại), API_CONTRACT_MODE=draft
- API_URL="", WS_URL="" (trống cho tới khi duyệt backend thật)

Không kết nối backend thật trong P20-25. Chỉ contract + frontend switch.
