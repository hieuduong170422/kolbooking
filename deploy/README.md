# Deploy kolbooking

Server: `34.126.124.249` (Ubuntu 26.04, project GCP `oceanic-granite-503715-j2`,
instance `affiliate`, zone `asia-southeast1-b`).

Máy này **đã chạy sẵn một web khác** — audivy, gồm bốn container Docker, trong đó
`audivy-nginx-1` giữ cổng 80. Cách bố trí dưới đây không đụng một dòng nào tới
audivy: kolbooking là một tiến trình Node riêng nghe cổng 8090, database riêng.

```
http://34.126.124.249:8090  →  Node (PM2: kolbooking) ─ phục vụ cả giao diện lẫn API
                                 └─ PostgreSQL 127.0.0.1:5432/kolbooking

http://34.126.124.249       →  audivy (Docker) — không liên quan
```

**Không cài nginx cho kolbooking.** Cổng 80 đã có chủ, và từ khi API tự phục vụ
bản build của client (`SERVE_CLIENT_DIR`) thì một tiến trình là đủ. Cài thêm
nginx hệ thống chỉ tạo xung đột cổng.

## Lần đầu

1. **Đẩy mã nguồn lên** (từ máy dev, ở thư mục gốc repo):

   ```bash
   ssh root@34.126.124.249 'mkdir -p /var/www/kolbooking-src'
   bash deploy/deploy.sh
   ```

   Lần đầu bước build sẽ báo thiếu `.env` — bình thường, làm tiếp bước 2.

2. **Chuẩn bị server** (trên server, quyền root):

   ```bash
   bash /var/www/kolbooking-src/deploy/setup-server.sh
   ```

   Cài Node 22 + PostgreSQL + PM2, tạo database, sinh `server/.env` với
   `JWT_SECRET` ngẫu nhiên và mật khẩu database ngẫu nhiên.

3. **Chạy lại deploy** để build và khởi động:

   ```bash
   bash deploy/deploy.sh
   ```

4. **Mở cổng 8090 trên firewall GCP** — cần tài khoản có quyền trên project:

   ```bash
   gcloud compute firewall-rules create kolbooking-8090 \
     --project=oceanic-granite-503715-j2 --allow tcp:8090 \
     --target-tags=http-server --source-ranges=0.0.0.0/0
   ```

   Chưa mở thì web chỉ truy cập được từ trong máy chủ (`curl localhost:8090`).

## Các lần sau

```bash
bash deploy/deploy.sh
```

rsync mã nguồn → build trên server → `pm2 reload`. Dữ liệu trong PostgreSQL
**không** bị đụng tới. Script tự kiểm tra sau khi deploy rằng audivy vẫn trả 200.

## Tài khoản demo

`SEED_DEMO_DATA=true` nạp sẵn dữ liệu mẫu khi database còn rỗng:
`admin@demo.vn`, `brand@demo.vn`, `creator2@demo.vn`, `creator@demo.vn`.

Mật khẩu chung lấy từ `DEMO_SEED_PASSWORD` trong `.env` (setup-server.sh sinh
ngẫu nhiên cho từng máy). Xem lại bằng:

```bash
grep DEMO_SEED_PASSWORD /var/www/kolbooking-src/server/.env
```

Bỏ trống `DEMO_SEED_PASSWORD` thì rơi về `Demo@1234` — mật khẩu nằm trong mã
nguồn công khai, nên `NODE_ENV=production` + `SEED_DEMO_DATA=true` mà thiếu nó
sẽ **chặn server khởi động**. Đổi mật khẩu = sửa `.env`, xoá các user demo
trong DB rồi khởi động lại (seed chỉ chạy khi bản ghi chưa tồn tại).

**Đặt `SEED_DEMO_DATA=false` trước khi cho người ngoài dùng.**

## Những điều cần biết

- **Chưa có HTTPS.** `.env` đang để `COOKIE_SECURE=false` vì trình duyệt loại bỏ
  cookie `Secure` trên `http://`, không tắt thì đăng nhập chết sau 15 phút. Mật
  khẩu và token đi qua mạng không mã hóa — chạy thử thì được, **đừng** mời người
  thật vào dùng.
  Khi có tên miền: trỏ A record về IP, cho audivy-nginx proxy sang cổng 8090 theo
  `server_name`, chạy certbot, rồi **xóa** dòng `COOKIE_SECURE` và `pm2 reload`.
- **OTP không gửi email.** Mailer in mã ra log: `pm2 logs kolbooking`. Hoặc đặt
  `DEV_OTP_CODE` — nhưng server sẽ **từ chối khởi động** nếu bật ở production,
  nên trên máy này phải đọc log.
- **File upload nằm trên đĩa server** tại `server/uploads` và
  `server/private-uploads`. `deploy.sh` cố tình loại hai thư mục này khỏi rsync
  nên deploy lại không xóa mất file đã tải lên.
- **Một tiến trình.** Muốn chạy cluster phải chuyển rate limiter sang store dùng
  chung (Redis) trước — bộ đếm hiện nằm trong bộ nhớ từng tiến trình.

## Chạy test đối chiếu với PostgreSQL

`npm test` mặc định chỉ chạy tầng lưu trữ in-memory. Bộ test hợp đồng
(`server/tests/repositories.*.contract.test.ts`) chạy **cùng một bộ assertion**
cho cả hai tầng — đặt `TEST_DATABASE_URL` để bản PostgreSQL cùng tham gia:

```bash
docker run -d --name kolbooking-pg -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=kolbooking_test -p 55432:5432 postgres:16-alpine

TEST_DATABASE_URL="postgres://postgres:postgres@127.0.0.1:55432/kolbooking_test" \
  npm test -w server
```

Mỗi tiến trình test làm việc trong một schema riêng nên chạy song song an toàn.

## Xử lý sự cố

```bash
pm2 logs kolbooking --lines 100     # log ứng dụng
pm2 restart kolbooking              # khởi động lại
pm2 list                            # trạng thái
sudo -u postgres psql kolbooking -c '\dt'   # xem các bảng

docker ps                           # audivy phải vẫn Up
ss -ltnp | grep -E ':80|:8090'      # ai đang giữ cổng nào
```

Server tự áp schema mỗi lần khởi động (`CREATE TABLE IF NOT EXISTS`), không cần
chạy migration thủ công.
