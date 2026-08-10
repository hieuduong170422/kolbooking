#!/usr/bin/env bash
#
# In địa chỉ công khai hiện tại của kolbooking.
#
# Quick tunnel của Cloudflare cấp tên miền ngẫu nhiên mỗi lần khởi động, nên
# sau khi bật máy phải xem lại link ở đây rồi mới gửi cho người khác.
set -euo pipefail

LOG="$HOME/Library/Logs/kolbooking-tunnel.log"

if [ ! -f "$LOG" ]; then
  echo "Chưa có log tunnel. Kiểm tra: launchctl list | grep kolbooking"
  exit 1
fi

# Lấy URL xuất hiện SAU CÙNG trong log — các lần khởi động trước đã chết.
url="$(grep -oE 'https://[a-z0-9-]+\.trycloudflare\.com' "$LOG" | tail -1)"

if [ -z "$url" ]; then
  echo "Chưa thấy URL trong log. Tunnel có thể đang khởi động, thử lại sau vài giây."
  exit 1
fi

# Kiểm tra API cục bộ chứ không đi vòng qua tunnel: DNS của máy thường còn nhớ
# kết quả "không tồn tại" của tên miền vừa cấp, nên thử qua tunnel sẽ báo hỏng
# oan trong khi người ngoài vào được bình thường.
if curl -sf -o /dev/null --max-time 5 http://127.0.0.1:4100/api/v1/health; then
  echo "$url"
else
  echo "$url"
  echo "⚠ API không phản hồi ở cổng 4100 — xem log: tail ~/Library/Logs/kolbooking-api.log"
fi
