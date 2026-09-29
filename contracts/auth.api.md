# Auth API Contract — DRAFT (no DB migration)
BASE: {API_URL}/auth (khi DATA_MODE=api)
Endpoints (contract only, chưa implement):
- POST /auth/register {username,email,password} -> {account_id, username, email}
- POST /auth/login {username|email, password} -> set HttpOnly Secure Cookie + {account_id}
- POST /auth/logout -> clear cookie
- GET  /auth/me -> {account_id, username, email, mainCharacterId, createdAt} | 401
Error codes: INVALID_CREDENTIALS, ACCOUNT_EXISTS, VALIDATION_ERROR
STOP: nếu cần migration DB hoặc đổi login protocol -> DỪNG, NEED_USER_APPROVAL
