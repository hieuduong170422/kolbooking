# Deploy kolbooking lên server dùng chung

Server đích: `34.126.124.249` (đang chạy sẵn một web khác).
Cách bố trí này **không đụng** tới web đang có: kolbooking nghe ở **cổng 8080**,
API chạy nội bộ ở cổng 4100, database riêng tên `kolbooking`.

```
http://34.126.124.249:8080  →  nginx (cổng 8080)
    /            →  /var/www/kolbooking          (client build, file tĩnh)
    /api/        →  127.0.0.1:4100               (PM2: kolbooking-api)
    /uploads/    →  127.0.0.1:4100
                     └─ PostgreSQL 127.0.0.1:5432/kolbooking
```

## Lần đầu

1. **Mở firewall GCP** cho cổng 8080 (và cổng 22 cho IP của bạn nếu chưa vào được SSH):

   ```bash
   gcloud compute firewall-rules create kolbooking-8080 \
     --allow tcp:8080 --source-ranges 0.0.0.0/0
   ```

2. **Đẩy mã nguồn lên** (từ máy dev, ở thư mục gốc repo):

   ```bash
   bash deploy/deploy.sh
   ```

   Lần đầu bước build sẽ báo thiếu `.env` — bình thường, làm tiếp bước 3.

3. **Chuẩn bị server** (trên server, quyền root):

   ```bash
   bash /var/www/kolbooking-src/deploy/setup-server.sh
   ```

   Script cài nginx + PostgreSQL + Node 22 + PM2, tạo database, sinh
   `server/.env` với `JWT_SECRET` ngẫu nhiên và mật khẩu database ngẫu nhiên.

4. **Chạy lại deploy** để khởi động API:

   ```bash
   bash deploy/deploy.sh
   ```

5. Mở `http://34.126.124.249:8080`.

## Các lần sau

```bash
bash deploy/deploy.sh
```

Script rsync mã nguồn, build trên server, cập nhật file tĩnh và `pm2 reload`.
Dữ liệu trong PostgreSQL **không** bị đụng tới khi deploy lại.

## Tài khoản demo

`SEED_DEMO_DATA=true` trong `.env` nạp sẵn dữ liệu mẫu khi database còn rỗng:

| Email | Vai trò |
|---|---|
| `admin@demo.vn` | Quản trị |
| `brand@demo.vn` | Nhãn hàng |
| `creator2@demo.vn` | Creator đã duyệt (có package bán) |
| `creator@demo.vn` | Creator hồ sơ nháp |

Mật khẩu chung: `Demo@1234`.

**Đặt `SEED_DEMO_DATA=false` trước khi cho người ngoài dùng** — mật khẩu này
nằm trong mã nguồn công khai.

## Những điều cần biết

- **Chưa có HTTPS.** `.env` đang đặt `COOKIE_SECURE=false` vì trình duyệt loại
  bỏ cookie `Secure` trên `http://`, không có nó thì đăng nhập chết sau 15 phút.
  Mật khẩu và token đi qua mạng ở dạng không mã hóa — chấp nhận được để chạy
  thử, **không** để mời người thật vào dùng.
  Khi có tên miền: trỏ A record về IP, đổi nginx sang `listen 80` +
  `server_name`, chạy `certbot --nginx`, rồi **xóa** dòng `COOKIE_SECURE` trong
  `.env` và `pm2 reload`.
- **OTP không gửi email.** Mailer hiện in mã ra log. Xem bằng:
  `pm2 logs kolbooking-api`. Xác minh email và đặt lại mật khẩu vẫn chạy được,
  chỉ là phải đọc log để lấy mã.
- **File upload nằm trên đĩa server** tại `server/uploads` và
  `server/private-uploads`. `deploy.sh` cố tình loại hai thư mục này khỏi rsync
  nên deploy lại không xóa mất file đã tải lên.
- **Một tiến trình API.** Muốn chạy cluster nhiều tiến trình thì phải chuyển
  rate limiter sang store dùng chung (Redis) trước — bộ đếm hiện nằm trong bộ
  nhớ của từng tiến trình.

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
pm2 logs kolbooking-api --lines 100    # log API
pm2 restart kolbooking-api             # khởi động lại
tail -50 /var/log/nginx/kolbooking.error.log
sudo -u postgres psql kolbooking -c '\dt'   # xem các bảng đã tạo
```

Server tự áp schema mỗi lần khởi động (`CREATE TABLE IF NOT EXISTS`), nên không
cần chạy migration thủ công.
