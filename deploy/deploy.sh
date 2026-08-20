#!/usr/bin/env bash
#
# Đẩy mã nguồn lên server rồi build và khởi động lại.
# Chạy TỪ MÁY DEV, ở thư mục gốc repo:  bash deploy/deploy.sh
#
# Không dùng git trên server: đồng bộ thẳng thư mục làm việc bằng rsync, nên
# deploy được cả khi thay đổi chưa commit. Đổi lại, thứ đang chạy trên server
# đúng bằng thứ đang có trên máy — hãy chắc là test đã xanh.
set -euo pipefail

SERVER="${SERVER:-root@34.126.124.249}"
APP_DIR=/var/www/kolbooking-src
APP_PORT=8090
REMOTE_ENV=$APP_DIR/server/.env

log() { printf '\n=== %s\n' "$1"; }

log "Kiểm tra kết nối SSH tới $SERVER"
if ! ssh -o ConnectTimeout=10 -o BatchMode=yes "$SERVER" 'echo ok' >/dev/null 2>&1; then
  cat >&2 <<EOF
Không SSH được tới $SERVER.
Kiểm tra: VM đang bật? firewall GCP có mở cổng 22 cho IP hiện tại của bạn?
EOF
  exit 1
fi

# Kiểm tra .env trên server TRƯỚC khi đụng vào bất cứ thứ gì.
# env.ts chặn boot khi NODE_ENV=production + SEED_DEMO_DATA=true mà thiếu
# DEMO_SEED_PASSWORD. Không kiểm ở đây thì lỗi chỉ lộ ra ở bước pm2 reload —
# lúc đó mã nguồn mới đã ghi đè bản cũ và app nằm im.
log "Kiểm tra cấu hình .env trên server"
ssh "$SERVER" "bash -s" <<REMOTE_ENV_CHECK
set -euo pipefail
ENV="$REMOTE_ENV"
if [ ! -f "\$ENV" ]; then
  echo "LỖI: không thấy \$ENV — chạy deploy/setup-server.sh trước." >&2
  exit 1
fi
node_env=\$(grep -E '^NODE_ENV=' "\$ENV" | cut -d= -f2- || true)
seed_demo=\$(grep -E '^SEED_DEMO_DATA=' "\$ENV" | cut -d= -f2- || true)
if [ "\$node_env" = "production" ] && [ "\$seed_demo" = "true" ] \
   && ! grep -q '^DEMO_SEED_PASSWORD=.\+' "\$ENV"; then
  cat >&2 <<MSG
LỖI: \$ENV thiếu DEMO_SEED_PASSWORD.
NODE_ENV=production + SEED_DEMO_DATA=true mà không đặt mật khẩu demo thì server
từ chối khởi động (mật khẩu mặc định Demo@1234 nằm trong mã nguồn công khai).

Sửa trên server (hai bước, tránh dán nhầm):
  openssl rand -base64 18
  echo "DEMO_SEED_PASSWORD=<dán chuỗi vừa sinh>" >> \$ENV

Hoặc tắt hẳn dữ liệu demo: đổi SEED_DEMO_DATA=false.
MSG
  exit 1
fi
echo "OK"
REMOTE_ENV_CHECK

log "Đồng bộ mã nguồn"
rsync -az --delete \
  --exclude '.git' \
  --exclude 'node_modules' \
  --exclude 'dist' \
  --exclude '.env' \
  --exclude 'server/uploads' \
  --exclude 'server/private-uploads' \
  ./ "$SERVER:$APP_DIR/"

log "Cài dependency và build trên server"
# Cài đủ cả devDependencies: bản build cần typescript và vite.
ssh "$SERVER" "cd $APP_DIR && npm ci && npm run build"

log "Khởi động lại ứng dụng"
ssh "$SERVER" "cd $APP_DIR && (pm2 reload deploy/ecosystem.config.cjs --update-env || pm2 start deploy/ecosystem.config.cjs) && pm2 save"

log "Kiểm tra sau khi deploy"
ssh "$SERVER" "sleep 3 && curl -sf http://127.0.0.1:$APP_PORT/api/v1/health" && echo
# Web khác trên cùng máy phải không hề bị ảnh hưởng.
ssh "$SERVER" "curl -s -o /dev/null -w 'web audivy trên cổng 80: %{http_code}\n' --max-time 5 http://127.0.0.1/"
echo "Xong: http://34.126.124.249:$APP_PORT"
