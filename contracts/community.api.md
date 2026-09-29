# Community / Chat API Contract — DRAFT (read-only + mock write)
GET {API_URL}/community/posts, GET {API_URL}/chat/channels, GET {API_URL}/chat/messages?channel=...
POST {API_URL}/chat/messages (mock local hiện tại, chưa WebSocket)
WS {WS_URL}/chat — chưa nối, DATA_MODE=mock thì không connect.
UI dùng community identity = mainCharacter (name/level/class/rank).
