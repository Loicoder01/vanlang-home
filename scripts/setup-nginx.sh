#!/usr/bin/env bash
set -euo pipefail
# vanlang-home/scripts/setup-nginx.sh — CHỈ chạy khi cần sửa Nginx/SSL (không dùng trong normal deploy)
# Dùng: ./scripts/setup-nginx.sh
# Yêu cầu: DNS trangchu.vanlang.biz -> 180.93.116.150, port 80 mở
VPS_HOST="${VANLANG_VPS_HOST:-180.93.116.150}"
VPS_USER="${VANLANG_VPS_USER:-vanlang}"
VPS_PORT="${VANLANG_VPS_PORT:-22}"
KEY="$HOME/.ssh/vanlang_vps_ed25519"
SSH="ssh -i $KEY -o IdentitiesOnly=yes -o StrictHostKeyChecking=accept-new -p $VPS_PORT $VPS_USER@$VPS_HOST"
echo "Upload nginx/trangchu.conf -> /etc/nginx/sites-available/trangchu"
scp -i "$KEY" -o IdentitiesOnly=yes -o StrictHostKeyChecking=accept-new -P "$VPS_PORT" nginx/trangchu.conf "$VPS_USER@$VPS_HOST:/tmp/vanlang-trangchu.conf"
$SSH "sudo cp /tmp/vanlang-trangchu.conf /etc/nginx/sites-available/trangchu && sudo ln -sfn /etc/nginx/sites-available/trangchu /etc/nginx/sites-enabled/trangchu && sudo nginx -t && sudo systemctl reload nginx && echo OK"
echo "Nếu cần SSL: ssh $VPS_USER@$VPS_HOST rồi sudo certbot --nginx -d trangchu.vanlang.biz"
