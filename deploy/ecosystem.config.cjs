/**
 * PM2 cho API kolbooking — chạy trên server:
 *   pm2 start deploy/ecosystem.config.cjs
 *   pm2 save && pm2 startup     # tự khởi động lại sau khi reboot
 *
 * Cấu hình nhạy cảm (JWT_SECRET, DATABASE_URL) KHÔNG nằm ở đây mà ở
 * server/.env — file này nằm trong git, .env thì không.
 */
module.exports = {
  apps: [
    {
      name: 'kolbooking-api',
      cwd: '/var/www/kolbooking-src/server',
      script: 'dist/index.js',
      // Một tiến trình là đủ cho giai đoạn thử nghiệm. Muốn chạy cluster thì
      // phải chuyển rate limiter sang store dùng chung (Redis) trước, vì bộ đếm
      // hiện nằm trong bộ nhớ của từng tiến trình.
      instances: 1,
      exec_mode: 'fork',
      max_memory_restart: '400M',
      env: {
        NODE_ENV: 'production',
        PORT: 4100,
      },
      error_file: '/var/log/kolbooking/api.error.log',
      out_file: '/var/log/kolbooking/api.out.log',
      merge_logs: true,
      time: true,
    },
  ],
};
