#!/usr/bin/env bash
#
# Chuẩn bị server lần đầu (Ubuntu/Debian) cho kolbooking.
# Chạy TRÊN SERVER với quyền root:  bash setup-server.sh
#
# Idempotent: chạy lại nhiều lần không hỏng gì. KHÔNG đụng tới web đang chạy
# sẵn trên server — chỉ thêm cấu hình nginx ở cổng 8080 và một database mới.
set -euo pipefail

APP_DIR=/var/www/kolbooking-src     # mã nguồn + bản build của server
WEB_DIR=/var/www/kolbooking         # file tĩnh của client
LOG_DIR=/var/log/kolbooking
DB_NAME=kolbooking
DB_USER=kolbooking

log() { printf '\n=== %s\n' "$1"; }

log "Cài gói hệ thống (nginx, postgresql, curl)"
apt-get update -qq
apt-get install -y -qq nginx postgresql postgresql-contrib curl rsync

log "Cài Node.js 22 nếu chưa có"
if ! command -v node >/dev/null 2>&1 || [ "$(node -v | cut -d. -f1 | tr -d 'v')" -lt 20 ]; then
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
  apt-get install -y -qq nodejs
fi
node -v

log "Cài PM2 nếu chưa có"
command -v pm2 >/dev/null 2>&1 || npm install -g pm2

log "Tạo thư mục"
mkdir -p "$APP_DIR" "$WEB_DIR" "$LOG_DIR"

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
PORT=4100
LOG_LEVEL=info

# Truy cập qua IP + cổng 8080 (chưa có tên miền).
CORS_ORIGIN=http://34.126.124.249:8080

# HTTP trần: trình duyệt loại bỏ cookie Secure trên http:// nên phải tắt.
# CÓ HTTPS RỒI THÌ XÓA DÒNG NÀY.
COOKIE_SECURE=false

DATABASE_URL=postgres://$DB_USER:$DB_PASS@127.0.0.1:5432/$DB_NAME
DATABASE_POOL_MAX=10

# Dữ liệu demo để bấm thử ngay. TẮT khi có người dùng thật.
SEED_DEMO_DATA=true

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

log "Cấu hình nginx (cổng 8080)"
if [ -f "$APP_DIR/deploy/nginx-kolbooking.conf" ]; then
  cp "$APP_DIR/deploy/nginx-kolbooking.conf" /etc/nginx/sites-available/kolbooking
  ln -sf /etc/nginx/sites-available/kolbooking /etc/nginx/sites-enabled/kolbooking
  nginx -t
  systemctl reload nginx
else
  echo "Chưa có mã nguồn ở $APP_DIR — chạy deploy.sh trước rồi chạy lại script này."
fi

log "Xong"
cat <<EOF
Còn lại:
  1. Mở cổng 8080 trên firewall GCP:
     gcloud compute firewall-rules create kolbooking-8080 \\
       --allow tcp:8080 --source-ranges 0.0.0.0/0
  2. Từ máy dev chạy: bash deploy/deploy.sh
  3. Mở http://34.126.124.249:8080
EOF
