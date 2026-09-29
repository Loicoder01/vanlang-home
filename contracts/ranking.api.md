# Ranking API Contract — DRAFT (read-only)
GET {API_URL}/rankings?tab=topLevel|topPower|topEquip|topBoss&limit=10
Response: {items:[{rank, charId, name, classId, level, value, account_id}], myRank?}
Source: character level/power từ game data. Mock hiện: data/rankings.json (DEMO).
