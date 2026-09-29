# DEPLOYMENT — vanlang-home (trangchu.vanlang.biz)

> Trang chủ và game là hai project độc lập. File này chỉ mô tả trang chủ.

## Domain

| Host | Mục đích |
|---|---|
| `trangchu.vanlang.biz` | Website giới thiệu — project này |
| `game.vanlang.biz` | WebApp game V0.6 — do `VANLANG_REBUILD_AI/scripts/vps/` quản lý |

Cả hai trỏ về `180.93.116.150` (DNS đã cấu hình). Không để update website làm hỏng game và ngược lại.

## Đường dẫn

| Mục | Đường dẫn |
|---|---|
| Source | `/Users/macos/Documents/vanlang/vanlang-home/` (dev) |
| Production (VPS) | `/opt/vanlang-home/` (theo `nginx/trangchu.conf` — chưa deploy) |
| Nginx config (source) | `vanlang-home/nginx/trangchu.conf` |
| Nginx config (VPS) | `/etc/nginx/sites-available/trangchu` → `sites-enabled/trangchu` |
| Art | `assets/art/*.png` (6 file, ~10 MB) |

> Spec gốc ghi `/var/www/vanlang-home/dist` — project này dùng `/opt/vanlang-home` (giữ đồng nhất với ghi chú trong `nginx/trangchu.conf`). Khi deploy lần đầu, chọn một và giữ cố định.

## GAME_URL — cấu hình duy nhất

`js/config.js`:

```js
window.VANLANG_CONFIG = {
  GAME_URL: "https://game.vanlang.biz",
  STAGING_URL: "http://180.93.116.150",
  VERSION: "V0.6 — chờ V0.6-STABLE"
};
```

Mọi nút `CHƠI NGAY` (`playBtnTop`, `playBtnHero`, `playBtnPlay`, `playBtnCta`, `playBtnMobile`) đều đọc `GAME_URL` này — không hardcode rải rác. Khi tag `V0.6-STABLE` được gắn, chỉ cần đổi `GAME_URL` và deploy lại trang chủ.

## Build

Trang chủ là **static HTML/CSS/JS** — không cần bundler. Không có `package.json`.

```bash
# Kiểm tra cú pháp
node --check js/*.js

# Preview local (port 5173)
python3 -m http.server 5173
# hoặc qua launch.json: vanlang-home
```

Khi cần build tối ưu (nén ảnh, minify) thì thêm Vite sau — hiện tại chưa cần.

## Deploy lên VPS

```bash
# 1. Backup Nginx trên VPS
ssh vanlang@180.93.116.150 "sudo mkdir -p /root/backup-nginx-$(date +%Y%m%d-%H%M) && sudo cp -a /etc/nginx/nginx.conf /etc/nginx/sites-available /etc/nginx/sites-enabled /etc/nginx/conf.d /root/backup-nginx-XXX/"

# 2. Đưa source lên VPS
rsync -az --delete vanlang-home/ vanlang@180.93.116.150:/opt/vanlang-home/

# 3. Cài Nginx site
ssh vanlang@180.93.116.150 "sudo cp /opt/vanlang-home/nginx/trangchu.conf /etc/nginx/sites-available/trangchu && sudo ln -sf /etc/nginx/sites-available/trangchu /etc/nginx/sites-enabled/trangchu && sudo nginx -t && sudo systemctl reload nginx"

# 4. Cấp SSL (khi DNS đã resolve)
ssh vanlang@180.93.116.150 "sudo certbot --nginx -d trangchu.vanlang.biz -d www.trangchu.vanlang.biz"
# Hoặc cấp chung với game:
# sudo certbot --nginx -d trangchu.vanlang.biz -d game.vanlang.biz
```

## Nginx

- Trang chủ: `server_name trangchu.vanlang.biz www.trangchu.vanlang.biz;` — `try_files $uri $uri/ /index.html;`
- Game: `server_name game.vanlang.biz;` — do `VANLANG_REBUILD_AI/scripts/vps/nginx-vanlang.conf` quản lý (đừng ghi đè).
- `nginx -t` phải `syntax is ok` / `test is successful` mới `reload`.

## SEO

- `title`: `Văn Lang – MMORPG 2D Việt Nam`
- `meta description`, `og:*`, `twitter:card`, `canonical`
- `robots.txt`, `sitemap.xml`, `assets/favicon.svg`

## Rollback

- Nginx lỗi: `sudo cp -a /root/backup-nginx-XXX/* /etc/nginx/` rồi `nginx -t && systemctl reload nginx`.
- Trang chủ lỗi: `rsync` lại bản trước.
- Ưu tiên: **game đang chạy > trang chủ**.

## Trạng thái hiện tại (2026-09-29)

- Source hoàn thiện local, chưa deploy lên VPS (VPS không kết nối được từ môi trường dev hiện tại — cần SSH trực tiếp).
- Chưa cấp SSL (phụ thuộc DNS + deploy).
- Chưa test `https://trangchu.vanlang.biz` production.
