#!/usr/bin/env bash
set -euo pipefail

# vanlang-home/scripts/deploy.sh — NORMAL UI deploy (không chạm Nginx/SSL)
# Chạy từ GitHub Actions hoặc thủ công trên runner/macOS.
# Env Secrets: VANLANG_VPS_HOST, VANLANG_VPS_USER, VANLANG_VPS_SSH_KEY (viết ra ~/.ssh), VANLANG_VPS_PORT (optional)
# Mục tiêu: rsync -> /opt/vanlang-home, nginx -t + reload, healthcheck, rollback nếu FAIL.

VPS_HOST="${VANLANG_VPS_HOST:-180.93.116.150}"
VPS_USER="${VANLANG_VPS_USER:-vanlang}"
VPS_PORT="${VANLANG_VPS_PORT:-22}"
KEY="$HOME/.ssh/vanlang_vps_ed25519"
PROD_DIR="/opt/vanlang-home"
RELEASES_DIR="/opt/vanlang-home-releases"
DEPLOY_LOG_DIR="/opt/vanlang-home-deploy"
HOME_URL="https://trangchu.vanlang.biz"
GAME_URL="https://game.vanlang.biz"

SSH="ssh -i $KEY -o IdentitiesOnly=yes -o StrictHostKeyChecking=accept-new -o ConnectTimeout=15 -p $VPS_PORT $VPS_USER@$VPS_HOST"
RSYNC_SSH="ssh -i $KEY -o IdentitiesOnly=yes -o StrictHostKeyChecking=accept-new -p $VPS_PORT"

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'; NC='\033[0m'
step() { echo -e "${CYAN}==>${NC} $*"; }
ok()   { echo -e "${GREEN}  OK${NC} $*"; }
warn() { echo -e "${YELLOW}WARN${NC} $*"; }
fail() { echo -e "${RED}FAIL${C_NC} $*"; }

COMMIT="$(git rev-parse --short HEAD 2>/dev/null || echo "unknown")"
DEPLOY_ID="$(date +%Y%m%d-%H%M%S)-$COMMIT"
RELEASE_PATH="$RELEASES_DIR/$DEPLOY_ID"

step "Deploy $DEPLOY_ID -> $VPS_USER@$VPS_HOST:$PROD_DIR"

# ── 1. Backup current production (trên VPS) ────────────────────────
step "Backup current production"
$SSH "sudo mkdir -p $RELEASES_DIR $DEPLOY_LOG_DIR && \
  if [ -d $PROD_DIR ] && [ \"\$(ls -A $PROD_DIR 2>/dev/null)\" ]; then \
    sudo mkdir -p $RELEASE_PATH && sudo cp -a $PROD_DIR/. $RELEASE_PATH/ && echo BACKUP:$RELEASE_PATH; \
  else \
    echo BACKUP:SKIP_EMPTY; \
  fi; \
  ls -1 $RELEASES_DIR 2>/dev/null | head -20; \
  cd $RELEASES_DIR 2>/dev/null && ls -1 | sort | head -n -5 | xargs -r -I{} sudo rm -rf \"{}\" 2>/dev/null || true; \
  echo PRUNE_KEEP_5_DONE"

# ── 2. Rsync ───────────────────────────────────────────────────────
step "Rsync -> $PROD_DIR"
$SSH "sudo mkdir -p $PROD_DIR && sudo chown -R $VPS_USER:$VPS_USER $PROD_DIR"
rsync -az --delete \
  --exclude='.git' --exclude='.github' --exclude='.DS_Store' \
  --exclude='node_modules' --exclude='.claude' --exclude='.agents' --exclude='.codex' \
  --exclude='deploy-home.sh' --exclude='scripts/' --exclude='nginx/' --exclude='DEPLOYMENT.md' \
  -e "$RSYNC_SSH" \
  ./ "$VPS_USER@$VPS_HOST:$PROD_DIR/"
ok "Rsync OK"

# ── 3. nginx -t + reload (KHÔNG sửa config, chỉ kiểm) ──────────────
step "nginx -t"
if ! $SSH "sudo nginx -t 2>&1"; then
  echo -e "${RED}nginx -t FAIL — rollback${NC}"
  bash "$(dirname "$0")/rollback.sh" || true
  exit 1
fi
ok "nginx -t PASS"
$SSH "sudo systemctl reload nginx && systemctl is-active nginx" || {
  echo -e "${RED}reload FAIL — rollback${NC}"
  bash "$(dirname "$0")/rollback.sh" || true
  exit 1
}
ok "nginx reload OK"

# ── 4. Healthcheck ─────────────────────────────────────────────────
step "Healthcheck $HOME_URL"
set +e
HTTP_CODE=$($SSH "curl -fsSI $HOME_URL 2>&1 | head -1 | grep -oE '[0-9]{3}' | head -1" | tr -d '\r' | xargs)
set -e
if ! echo "$HTTP_CODE" | grep -qE '^(200|301|302)$'; then
  echo -e "${RED}HTTP $HOME_URL -> ${HTTP_CODE:-no response} — rollback${NC}"
  bash "$(dirname "$0")/rollback.sh" || true
  exit 1
fi
ok "HTTP $HOME_URL -> $HTTP_CODE"

set +e
BODY=$($SSH "curl -fsS $HOME_URL 2>&1")
set -e
if ! echo "$BODY" | grep -q "VĂN LANG"; then warn "Body missing VĂN LANG"; else ok "Body has VĂN LANG"; fi
if ! echo "$BODY" | grep -q "ABEO MEDIA"; then warn "Body missing ABEO MEDIA (text badge)"; else ok "Body has ABEO MEDIA"; fi
if ! echo "$BODY" | grep -q "$GAME_URL"; then warn "Body missing $GAME_URL"; else ok "Body has $GAME_URL"; fi

# Asset probe (tương đối từ index.html href/src)
ASSET_FAIL=0
for asset in $(echo "$BODY" | grep -oE '(href|src)="[^"]+\.(css|js|png|jpg|jpeg|svg|ico|webp)"' | sed -E 's/.*="([^"]+)".*/\1/' | head -10); do
  if echo "$asset" | grep -q "^https\?://"; then AURL="$asset"
  elif echo "$asset" | grep -q "^//"; then AURL="https:$asset"
  elif echo "$asset" | grep -q "^/"; then AURL="${HOME_URL%/}$asset"
  else AURL="${HOME_URL}$asset"; fi
  set +e
  ACODE=$($SSH "curl -fsSI \"$AURL\" 2>&1 | head -1 | grep -oE '[0-9]{3}' | head -1" | tr -d '\r' | xargs)
  set -e
  if echo "$ACODE" | grep -q "^200$"; then ok "Asset $asset -> 200"; else warn "Asset $asset -> ${ACODE:-no response}"; ASSET_FAIL=1; fi
done

# nav sanity (top nav 8 links)
TOP_NAV_COUNT=$(echo "$BODY" | grep -o 'href="#[^"]*"' | head -20 | wc -l | tr -d ' ')
if [ "$TOP_NAV_COUNT" -lt 6 ]; then warn "Top nav links low: $TOP_NAV_COUNT"; else ok "Nav links: $TOP_NAV_COUNT"; fi

# Nếu asset chính fail nhiều thì rollback? Hiện chỉ warn, không rollback auto vì asset CDN/proxy có thể delay.
# Chỉ rollback nếu HTTP 200 fail đã xử lý ở trên.

# ── 5. Ghi version + log ───────────────────────────────────────────
step "Ghi version + log"
$SSH "cat > $PROD_DIR/assets/version.json <<JSON
{
  \"version\": \"home-$COMMIT\",
  \"commit\": \"$COMMIT\",
  \"deployedAt\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",
  \"deployId\": \"$DEPLOY_ID\",
  \"homeUrl\": \"$HOME_URL\",
  \"gameUrl\": \"$GAME_URL\"
}
JSON
cat $PROD_DIR/assets/version.json 2>&1 | head -10"

# deploy log (lưu trên VPS, không git)
$SSH "sudo mkdir -p $DEPLOY_LOG_DIR && echo \"\$(date -u +%Y-%m-%dT%H:%M:%SZ) $DEPLOY_ID $COMMIT PASS\" | sudo tee -a $DEPLOY_LOG_DIR/deploy.log >/dev/null && sudo tail -5 $DEPLOY_LOG_DIR/deploy.log"

# ── 6. Game safety (read-only) ─────────────────────────────────────
step "Game safety check (read-only)"
$SSH "for svc in vanlang-server vanlang-gateway mariadb; do echo -n \"\$svc: \"; systemctl is-active \$svc 2>&1 | tr -d '\n' || echo inactive; echo; done; sudo ss -tulpn 2>&1 | grep -E ':(80|443|2907|2908|3306)' | head -10 || true"

# ── Summary ─────────────────────────────────────────────────────────
echo ""
echo "════════════════════════════════════════"
echo "  DEPLOY PASS — $HOME_URL ($DEPLOY_ID)"
echo "════════════════════════════════════════"
echo "  HOME:  $HOME_URL"
echo "  GAME:  $GAME_URL"
echo "  Commit: $COMMIT"
echo "  Release: $RELEASE_PATH"
if [ "$ASSET_FAIL" = "1" ]; then echo "  Note: một số asset chưa 200 — kiểm lại sau vài giây (cache)"; fi
