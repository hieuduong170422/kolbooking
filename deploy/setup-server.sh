#!/usr/bin/env bash
#
# Chuẩn bị server lần đầu (Ubuntu) cho kolbooking.
# Chạy TRÊN SERVER với quyền root:  bash /var/www/kolbooking-src/deploy/setup-server.sh
#
# Idempotent: chạy lại nhiều lần không hỏng gì.
#
# KHÔNG cài nginx. Máy này đã có một web khác (audivy) chạy nginx trong Docker
# giữ cổng 80; cài thêm nginx hệ thống là xung đột cổng ngay, và cũng không cần
# nữa vì API tự phục vụ luôn bản build của client (SERVE_CLIENT_DIR).
set -euo pipefail

APP_DIR=/var/www/kolbooking-src
LOG_DIR=/var/log/kolbooking
DB_NAME=kolbooking
DB_USER=kolbooking
APP_PORT=8090

log() { printf '\n=== %s\n' "$1"; }

log "Cài PostgreSQL"
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get install -y -qq postgresql postgresql-contrib curl

log "Cài Node.js 22 nếu chưa có"
if ! command -v node >/dev/null 2>&1 || [ "$(node -v | cut -d. -f1 | tr -d 'v')" -lt 20 ]; then
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
  apt-get install -y -qq nodejs
fi
node -v

log "Cài PM2 nếu chưa có"
command -v pm2 >/dev/null 2>&1 || npm install -g pm2

log "Tạo thư mục"
mkdir -p "$APP_DIR" "$LOG_DIR"

log "Tạo database và tài khoản PostgreSQL"
systemctl enable --now postgresql
# Mật khẩu chỉ sinh MỘT LẦN; lần chạy sau giữ nguyên để .env không lệch với DB.
if sudo -u postgres psql -tAc "SELECT 1 FROM pg_roles WHERE rolname='$DB_USER'" | grep -q 1; then
  echo "Tài khoản $DB_USER đã tồn tại, giữ nguyên mật khẩu hiện có."
  DB_PASS=""
else
  DB_PASS="$(openssl rand -hex 24)"
  sudo -u postgres psql -c "CREATE ROLE $DB_USER LOGIN PASSWORD '$DB_PASS';"
fi
sudo -u postgres psql -tAc "SELECT 1 FROM pg_database WHERE datname='$DB_NAME'" | grep -q 1 \
  || sudo -u postgres createdb -O "$DB_USER" "$DB_NAME"

log "Tạo server/.env nếu chưa có"
ENV_FILE="$APP_DIR/server/.env"
mkdir -p "$APP_DIR/server"
if [ -f "$ENV_FILE" ]; then
  echo "$ENV_FILE đã tồn tại — không ghi đè."
else
  if [ -z "$DB_PASS" ]; then
    echo "LỖI: tài khoản database đã tồn tại nhưng chưa có .env, không biết mật khẩu."
    echo "Đặt lại bằng: sudo -u postgres psql -c \"ALTER ROLE $DB_USER PASSWORD 'mat-khau-moi';\""
    echo "rồi tự tạo $ENV_FILE theo mẫu server/.env.example."
    exit 1
  fi
  cat > "$ENV_FILE" <<EOF
NODE_ENV=production
PORT=$APP_PORT
LOG_LEVEL=info

# API phục vụ luôn bản build của client — một tiến trình, không cần nginx.
SERVE_CLIENT_DIR=../client/dist

# Cùng origin nên CORS không thực sự dùng tới; để đúng cho rõ ràng.
CORS_ORIGIN=http://34.126.124.249:$APP_PORT

# HTTP trần: trình duyệt loại bỏ cookie Secure trên http://, không tắt thì
# phiên đăng nhập chết ngay khi access token hết hạn.
# CÓ HTTPS RỒI THÌ XÓA DÒNG NÀY.
COOKIE_SECURE=false

DATABASE_URL=postgres://$DB_USER:$DB_PASS@127.0.0.1:5432/$DB_NAME
DATABASE_POOL_MAX=10

# Dữ liệu demo để bấm thử ngay. TẮT khi có người dùng thật.
SEED_DEMO_DATA=true
# Mật khẩu của bộ tài khoản demo — sinh ngẫu nhiên cho từng máy, KHÔNG dùng
# lại Demo@1234 trong mã nguồn công khai. Xem lại bằng: grep DEMO_SEED_PASSWORD $ENV_FILE
DEMO_SEED_PASSWORD=$(openssl rand -base64 18 | tr -d '\n')

JWT_SECRET=$(openssl rand -base64 48 | tr -d '\n')
ACCESS_TOKEN_TTL_SECONDS=900
REFRESH_TOKEN_TTL_DAYS=7

RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX=300
RATE_LIMIT_ENABLED=true
AUTH_RATE_LIMIT_MAX=10
EOF
  chmod 600 "$ENV_FILE"
  echo "Đã tạo $ENV_FILE"
fi

log "Xong"
cat <<EOF
Kiểm tra không đụng web đang chạy:
  docker ps            # audivy vẫn phải Up, vẫn giữ cổng 80
  ss -ltnp | grep :80  # vẫn là docker-proxy

Còn lại:
  1. Từ máy dev chạy: bash deploy/deploy.sh
  2. Mở cổng $APP_PORT trên firewall GCP (cần quyền trên project):
     gcloud compute firewall-rules create kolbooking-$APP_PORT \\
       --project=oceanic-granite-503715-j2 --allow tcp:$APP_PORT \\
       --target-tags=http-server --source-ranges=0.0.0.0/0
EOF
