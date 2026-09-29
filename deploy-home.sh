#!/bin/bash
set -euo pipefail

# VAN LANG HOMEPAGE — 1-command deploy
# DÙNG: cd /Users/macos/Documents/vanlang/vanlang-home && chmod +x deploy-home.sh && ./deploy-home.sh
# Chạy NGOÀI sandbox Claude, trên macOS Terminal. Không chạy trong sandbox.

HOME_URL="https://trangchu.vanlang.biz"
GAME_URL="https://game.vanlang.biz"
ADMIN_URL="https://abeo.vanlang.biz"
VPS="180.93.116.150"
VPS_USER="vanlang"
SSH_KEY="$HOME/.ssh/vanlang_vps_ed25519"
SOURCE_DIR="/Users/macos/Documents/vanlang/vanlang-home"
PROD_DIR="/opt/vanlang-home"

SSH="ssh -i $SSH_KEY -o IdentitiesOnly=yes -o StrictHostKeyChecking=accept-new -o ConnectTimeout=15 ${VPS_USER}@${VPS}"

BACKUP_PATH=""
NGINX_RESULT="FAIL"
HTTP_RESULT="FAIL"
HTTPS_RESULT="NOT CONFIGURED"
BRANDING_RESULT="WARNING"
GAME_SVC_RESULT="WARNING"
CERT_STATUS="NOT CONFIGURED"

# colors
C_RED='\033[0;31m'; C_GRN='\033[0;32m'; C_YEL='\033[0;33m'; C_CYN='\033[0;36m'; C_NC='\033[0m'

info()  { printf "${C_CYN}[%s]${C_NC} %s\n" "$1" "$2"; }
ok()    { printf "${C_GRN}  OK${C_NC} %s\n" "$1"; }
warn()  { printf "${C_YEL}WARN${C_NC} %s\n" "$1"; }
fail()  { printf "${C_RED}FAIL${C_NC} %s\n" "$1"; }

# ============================================================
# [1/10] Local check
# ============================================================
echo ""
echo "============================================================"
echo "[1/10] Local check"
echo "============================================================"

die() { printf "${C_RED}ERROR:${C_NC} %s\n" "$1"; exit 1; }

[ -d "$SOURCE_DIR" ]       || die "SOURCE_DIR missing: $SOURCE_DIR"
[ -f "$SOURCE_DIR/index.html" ]           || die "Missing: $SOURCE_DIR/index.html"
[ -f "$SOURCE_DIR/js/config.js" ]         || die "Missing: $SOURCE_DIR/js/config.js"
[ -f "$SOURCE_DIR/nginx/trangchu.conf" ]  || die "Missing: $SOURCE_DIR/nginx/trangchu.conf"
[ -f "$SSH_KEY" ]          || die "SSH key missing: $SSH_KEY"

# GAME_URL must be https://game.vanlang.biz in config
if ! grep -q "https://game.vanlang.biz" "$SOURCE_DIR/js/config.js"; then
  die "js/config.js must contain GAME_URL https://game.vanlang.biz"
fi
ok "js/config.js GAME_URL = https://game.vanlang.biz"

# branding asset check (non-blocking)
if [ -f "$SOURCE_DIR/assets/brand/logo-vanlang.png" ] || [ -f "$SOURCE_DIR/assets/brand/logo-vanlang-header.png" ]; then
  ok "Branding logo present"
else
  warn "Branding logo missing: assets/brand/logo-vanlang.png (deploy continues)"
fi
if [ -f "$SOURCE_DIR/assets/favicon.svg" ] || [ -f "$SOURCE_DIR/assets/brand/favicon.ico" ]; then
  ok "Favicon present"
else
  warn "Favicon missing (deploy continues)"
fi
if [ -f "$SOURCE_DIR/assets/brand/og-vanlang.jpg" ] || [ -f "$SOURCE_DIR/assets/brand/abeo-media-seal.png" ]; then
  ok "OG/seal assets present"
else
  warn "OG/seal assets missing (deploy continues)"
fi

if grep -q "ABEO MEDIA" "$SOURCE_DIR/index.html" 2>/dev/null; then
  ok "index.html contains ABEO MEDIA"
else
  warn "index.html missing ABEO MEDIA (check footer)"
fi

ok "Local check passed"

# ============================================================
# [2/10] SSH
# ============================================================
echo ""
echo "============================================================"
echo "[2/10] SSH"
echo "============================================================"

if ! $SSH "echo SSH_OK" 2>&1 | grep -q "SSH_OK"; then
  echo ""
  fail "Cannot SSH to ${VPS_USER}@${VPS} with key $SSH_KEY"
  echo "  Hint: check VPS IP, user, key permissions (chmod 600), and firewall."
  exit 1
fi
ok "SSH to ${VPS_USER}@${VPS} OK"

# ============================================================
# [3/10] VPS audit
# ============================================================
echo ""
echo "============================================================"
echo "[3/10] VPS audit"
echo "============================================================"

$SSH bash -s <<'AUDIT'
echo "--- hostname ---"; hostname 2>&1 || true
echo "--- whoami   ---"; whoami 2>&1 || true
echo "--- df -h    ---"; df -h 2>&1 | head -20
echo "--- free -h  ---"; free -h 2>&1 || vmstat 2>&1 | head -20
echo "--- ss -tulpn ---"; ss -tulpn 2>&1 | head -60 || netstat -tulpn 2>&1 | head -60 || true
echo "--- nginx -v  ---"; sudo nginx -v 2>&1 || nginx -v 2>&1 || true
echo "--- nginx -t  ---"; sudo nginx -t 2>&1 || nginx -t 2>&1 || true
echo "--- nginx status   ---"; sudo systemctl status nginx --no-pager 2>&1 | head -30 || true
echo "--- vanlang-server ---"; sudo systemctl status vanlang-server --no-pager 2>&1 | head -30 || echo "vanlang-server: not found / inactive"
echo "--- vanlang-gateway---"; sudo systemctl status vanlang-gateway --no-pager 2>&1 | head -30 || echo "vanlang-gateway: not found / inactive"
echo "--- mariadb        ---"; sudo systemctl status mariadb --no-pager 2>&1 | head -30 || sudo systemctl status mysql --no-pager 2>&1 | head -30 || echo "mariadb: not found"
AUDIT
ok "VPS audit printed (no changes made)"

# ============================================================
# [4/10] Nginx backup
# ============================================================
echo ""
echo "============================================================"
echo "[4/10] Nginx backup"
echo "============================================================"

BACKUP_PATH=$($SSH bash -s <<'EOS'
set -e
TS=$(date +%Y%m%d-%H%M%S)
DIR="/root/nginx-backup-${TS}"
sudo mkdir -p "$DIR"
sudo cp -a /etc/nginx/nginx.conf "$DIR/" 2>/dev/null || true
for d in sites-available sites-enabled conf.d; do
  if [ -d "/etc/nginx/$d" ]; then
    sudo mkdir -p "$DIR/$d"
    sudo cp -a /etc/nginx/$d/* "$DIR/$d/" 2>/dev/null || true
  fi
done
echo "$DIR"
EOS
)
# BACKUP_PATH comes from remote echo — trim
BACKUP_PATH=$(echo "$BACKUP_PATH" | tail -1 | tr -d '\r' | xargs)
echo "  Backup: $BACKUP_PATH"

# ============================================================
# [5/10] Upload homepage
# ============================================================
echo ""
echo "============================================================"
echo "[5/10] Upload homepage"
echo "============================================================"

$SSH "sudo mkdir -p $PROD_DIR && sudo chown -R ${VPS_USER}:${VPS_USER} $PROD_DIR"
ok "Production dir: $PROD_DIR"

rsync -az --delete \
  --exclude='.git' \
  --exclude='.DS_Store' \
  --exclude='.claude' \
  --exclude='node_modules' \
  --exclude='deploy-home.sh' \
  --exclude='scripts/' \
  --exclude='nginx/' \
  --exclude='DEPLOYMENT.md' \
  "${SOURCE_DIR}/" \
  "${VPS_USER}@${VPS}:${PROD_DIR}/" \
  -e "ssh -i $SSH_KEY -o IdentitiesOnly=yes"

ok "rsync -> ${VPS_USER}@${VPS}:${PROD_DIR}/"

# ============================================================
# [6/10] Install Nginx config
# ============================================================
echo ""
echo "============================================================"
echo "[6/10] Install Nginx config"
echo "============================================================"

# upload to /tmp then sudo move
scp -i "$SSH_KEY" -o IdentitiesOnly=yes \
  "$SOURCE_DIR/nginx/trangchu.conf" \
  "${VPS_USER}@${VPS}:/tmp/vanlang-trangchu.conf"

$SSH bash -s <<'EOS'
set -e
sudo cp /tmp/vanlang-trangchu.conf /etc/nginx/sites-available/trangchu
sudo ln -sfn /etc/nginx/sites-available/trangchu /etc/nginx/sites-enabled/trangchu
# do not touch other sites-enabled entries
echo "Installed: /etc/nginx/sites-available/trangchu"
ls -l /etc/nginx/sites-enabled/ 2>&1 | head -20
EOS
ok "Nginx site trangchu installed (other sites untouched)"

# ============================================================
# [7/10] Nginx test
# ============================================================
echo ""
echo "============================================================"
echo "[7/10] Nginx test"
echo "============================================================"

set +e
$SSH "sudo nginx -t" 2>&1
NGINX_T_EXIT=$?
set -e

if [ $NGINX_T_EXIT -ne 0 ]; then
  NGINX_RESULT="FAIL"
  echo ""
  fail "NGINX TEST FAILED — not reloading. Restore from: $BACKUP_PATH"
  echo "  Restore: sudo cp -a $BACKUP_PATH/* /etc/nginx/ && sudo nginx -t && sudo systemctl reload nginx"
  exit 1
fi
NGINX_RESULT="PASS"
ok "nginx -t PASS"

$SSH "sudo systemctl reload nginx"
ok "nginx reloaded (no restart)"

# ============================================================
# [8/10] SSL
# ============================================================
echo ""
echo "============================================================"
echo "[8/10] SSL"
echo "============================================================"

CERT_STATUS=$($SSH bash -s <<'EOS'
set +e
if ! command -v certbot >/dev/null 2>&1; then
  echo "CERTBOT_NOT_FOUND"
  exit 0
fi
# list certs (non-fatal)
sudo certbot certificates 2>&1 | head -40 || true
# check if trangchu already has cert
if sudo certbot certificates 2>&1 | grep -q "trangchu.vanlang.biz"; then
  echo "CERT_EXISTS"
  exit 0
fi
echo "CERT_MISSING"
EOS
)

CERT_STATUS=$(echo "$CERT_STATUS" | tail -1 | tr -d '\r' | xargs)

if echo "$CERT_STATUS" | grep -q "CERTBOT_NOT_FOUND"; then
  warn "Certbot not installed — HTTPS skipped (HTTP will work)"
  HTTPS_RESULT="NOT CONFIGURED"
elif echo "$CERT_STATUS" | grep -q "CERT_EXISTS"; then
  ok "Cert already exists for trangchu.vanlang.biz"
  HTTPS_RESULT="PASS"
  CERT_STATUS="CERT_EXISTS"
else
  # try to obtain cert — need to handle email requirement
  info "8/10" "Attempting certbot for trangchu.vanlang.biz ..."
  set +e
  # check if account already exists
  HAS_ACCOUNT=$($SSH "sudo ls /etc/letsencrypt/accounts 2>/dev/null | head -1" | tr -d '\r' | xargs)
  set -e
  if [ -z "$HAS_ACCOUNT" ]; then
    # no account — certbot --register-unsafely-without-email may be allowed, else requires email
    # try without email first; if it demands email, we skip
    set +e
    CERTBOT_OUT=$($SSH "sudo certbot --nginx -d trangchu.vanlang.biz --non-interactive --agree-tos --redirect --register-unsafely-without-email 2>&1" | tail -30)
    CERTBOT_EXIT=$?
    set -e
    if [ $CERTBOT_EXIT -ne 0 ]; then
      # check if error mentions email
      if echo "$CERTBOT_OUT" | grep -qi "email"; then
        echo ""
        warn "CERTBOT_EMAIL_REQUIRED — no Let's Encrypt account yet and certbot requires --email"
        warn "  Create manually: sudo certbot --nginx -d trangchu.vanlang.biz --email you@example.com --agree-tos --redirect"
        warn "  HTTP remains working; not rolling back."
        HTTPS_RESULT="NOT CONFIGURED"
      else
        echo "$CERTBOT_OUT"
        warn "Certbot failed (non-email reason) — see output above. HTTP remains working."
        HTTPS_RESULT="FAIL"
      fi
    else
      ok "Certbot succeeded (no-email registration)"
      HTTPS_RESULT="PASS"
      # reload after certbot modifies nginx
      $SSH "sudo nginx -t && sudo systemctl reload nginx" || true
    fi
  else
    # account exists — can run without email
    set +e
    CERTBOT_OUT=$($SSH "sudo certbot --nginx -d trangchu.vanlang.biz --non-interactive --agree-tos --redirect 2>&1" | tail -30)
    CERTBOT_EXIT=$?
    set -e
    if [ $CERTBOT_EXIT -ne 0 ]; then
      echo "$CERTBOT_OUT"
      warn "Certbot failed — see output above. HTTP remains working."
      HTTPS_RESULT="FAIL"
    else
      ok "Certbot succeeded"
      HTTPS_RESULT="PASS"
      $SSH "sudo nginx -t && sudo systemctl reload nginx" || true
    fi
  fi
fi

# ============================================================
# [9/10] Production QA
# ============================================================
echo ""
echo "============================================================"
echo "[9/10] Production QA"
echo "============================================================"

# determine which scheme to test (prefer https if we have it)
QA_URL="http://trangchu.vanlang.biz/"
if [ "$HTTPS_RESULT" = "PASS" ]; then
  QA_URL="https://trangchu.vanlang.biz/"
fi

# HTTP status check
set +e
HTTP_CODE=$($SSH "curl -fsSI ${QA_URL} 2>&1 | head -1 | grep -oE '[0-9]{3}' | head -1" | tr -d '\r' | xargs)
set -e
if echo "$HTTP_CODE" | grep -qE '^(200|301|302)$'; then
  HTTP_RESULT="PASS"
  ok "HTTP $QA_URL -> $HTTP_CODE"
else
  HTTP_RESULT="FAIL"
  warn "HTTP $QA_URL -> ${HTTP_CODE:-no response} (check DNS / firewall)"
  # extra DNS hint
  $SSH "getent hosts trangchu.vanlang.biz 2>&1 | head -5 || host trangchu.vanlang.biz 2>&1 | head -5 || true"
fi

# HTTPS probe if cert exists
if [ "$HTTPS_RESULT" = "PASS" ]; then
  set +e
  HTTPS_CODE=$($SSH "curl -fsSI https://trangchu.vanlang.biz/ 2>&1 | head -1 | grep -oE '[0-9]{3}' | head -1" | tr -d '\r' | xargs)
  set -e
  if echo "$HTTPS_CODE" | grep -qE '^(200|301|302)$'; then
    HTTPS_RESULT="PASS"
    ok "HTTPS https://trangchu.vanlang.biz/ -> $HTTPS_CODE"
  else
    HTTPS_RESULT="FAIL"
    warn "HTTPS probe -> ${HTTPS_CODE:-no response}"
  fi
fi

# Asset checks (via local index.html to avoid hardcoding wrong filenames)
# fetch homepage body
set +e
BODY=$($SSH "curl -fsS ${QA_URL} 2>&1")
set -e
if echo "$BODY" | grep -q "VĂN LANG"; then
  ok "Body contains VĂN LANG"
else
  warn "Body missing VĂN LANG"
fi
if echo "$BODY" | grep -q "ABEO MEDIA"; then
  BRANDING_RESULT="PASS"
  ok "Body contains ABEO MEDIA"
else
  warn "Body missing ABEO MEDIA"
  BRANDING_RESULT="WARNING"
fi
if echo "$BODY" | grep -q "https://game.vanlang.biz"; then
  ok "Body contains https://game.vanlang.biz"
else
  warn "Body missing https://game.vanlang.biz (check js/config.js / CTA links)"
fi

# verify static assets actually reachable (css/js/logo/favicon/og)
# derive paths from index.html href/src
for asset in $(echo "$BODY" | grep -oE '(href|src)="[^"]+\.(css|js|png|jpg|jpeg|svg|ico|webp)"' | sed -E 's/.*="([^"]+)".*/\1/' | head -10); do
  # normalize relative url
  if echo "$asset" | grep -q "^https\?://"; then
    AURL="$asset"
  elif echo "$asset" | grep -q "^//"; then
    AURL="https:$asset"
  elif echo "$asset" | grep -q "^/"; then
    # absolute path on same host
    AURL="${QA_URL%/}${asset}"
  else
    AURL="${QA_URL}${asset}"
  fi
  set +e
  ACODE=$($SSH "curl -fsSI \"$AURL\" 2>&1 | head -1 | grep -oE '[0-9]{3}' | head -1" | tr -d '\r' | xargs)
  set -e
  if echo "$ACODE" | grep -q "^200$"; then
    ok "Asset $asset -> 200"
  else
    warn "Asset $asset -> ${ACODE:-no response}"
  fi
done

# ============================================================
# [10/10] Game safety check (no restart)
# ============================================================
echo ""
echo "============================================================"
echo "[10/10] Game safety check (read-only, no restart)"
echo "============================================================"

$SSH bash -s <<'EOS'
echo "--- ss -tulpn ---"; ss -tulpn 2>&1 | head -40 || netstat -tulpn 2>&1 | head -40 || true
echo "--- vanlang-server ---"; sudo systemctl is-active vanlang-server 2>&1 || echo "vanlang-server: inactive / not found"
echo "--- vanlang-gateway---"; sudo systemctl is-active vanlang-gateway 2>&1 || echo "vanlang-gateway: inactive / not found"
echo "--- mariadb        ---"; sudo systemctl is-active mariadb 2>&1 || sudo systemctl is-active mysql 2>&1 || echo "mariadb: inactive / not found"
EOS

# decide game svc result based on active checks
ACTIVE_COUNT=$($SSH "sudo systemctl is-active vanlang-server 2>&1; sudo systemctl is-active vanlang-gateway 2>&1; sudo systemctl is-active mariadb 2>&1 || sudo systemctl is-active mysql 2>&1" | grep -c "active" || true)
if [ "$ACTIVE_COUNT" -ge 1 ]; then
  GAME_SVC_RESULT="UNCHANGED"
else
  # not necessarily bad — game may be stopped intentionally; just warn
  GAME_SVC_RESULT="WARNING"
  warn "Game services not all active (count active=$ACTIVE_COUNT) — verify manually"
fi

# ============================================================
# RESULT
# ============================================================
echo ""
echo "================================"
echo "VAN LANG HOMEPAGE DEPLOY RESULT"
echo "================================"
echo ""
echo "HOME:  https://trangchu.vanlang.biz"
echo "GAME:  https://game.vanlang.biz"
echo "ADMIN: https://abeo.vanlang.biz"
echo ""
echo "NGINX:         $NGINX_RESULT"
echo "HTTP:          $HTTP_RESULT"
echo "HTTPS:         $HTTPS_RESULT"
echo "BRANDING:      $BRANDING_RESULT"
echo "GAME SERVICES: $GAME_SVC_RESULT"
echo "BACKUP:        $BACKUP_PATH"
echo ""
echo "================================"
