#!/usr/bin/env bash
set -euo pipefail
# vanlang-home/scripts/rollback.sh — khôi phục bản trước nếu healthcheck fail
VPS_HOST="${VANLANG_VPS_HOST:-180.93.116.150}"
VPS_USER="${VANLANG_VPS_USER:-vanlang}"
VPS_PORT="${VANLANG_VPS_PORT:-22}"
KEY="$HOME/.ssh/vanlang_vps_ed25519"
PROD_DIR="/opt/vanlang-home"
RELEASES_DIR="/opt/vanlang-home-releases"
SSH="ssh -i $KEY -o IdentitiesOnly=yes -o StrictHostKeyChecking=accept-new -o ConnectTimeout=15 -p $VPS_PORT $VPS_USER@$VPS_HOST"

echo "=> Rollback: tìm bản trước trong $RELEASES_DIR"
$SSH bash <<EOS
set -e
LATEST=\$(ls -1 $RELEASES_DIR 2>/dev/null | sort | tail -1)
PREV=\$(ls -1 $RELEASES_DIR 2>/dev/null | sort | tail -2 | head -1)
echo "latest=\$LATEST prev=\$PREV"
if [ -z "\$LATEST" ]; then echo "No releases to rollback"; exit 1; fi
# Nếu chỉ có 1 bản thì restore bản đó; nếu có >=2 thì restore PREV
TARGET="\$LATEST"
if [ -n "\$PREV" ]; then TARGET="\$PREV"; fi
echo "Restoring \$RELEASES_DIR/\$TARGET -> $PROD_DIR"
sudo rm -rf $PROD_DIR
sudo mkdir -p $PROD_DIR
sudo cp -a $RELEASES_DIR/\$TARGET/. $PROD_DIR/
sudo chown -R $VPS_USER:$VPS_USER $PROD_DIR
sudo nginx -t && sudo systemctl reload nginx
curl -fsSI https://trangchu.vanlang.biz/ 2>&1 | head -1 || curl -fsSI http://trangchu.vanlang.biz/ 2>&1 | head -1 || true
echo "Rollback done (restored \$TARGET)"
EOS
