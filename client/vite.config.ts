import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
      '/uploads': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
    },
  },
  // `vite preview` phục vụ bản build thật. Client gọi API bằng đường dẫn tương
  // đối nên phải chuyển tiếp /api và /uploads y như dev server, nếu không bản
  // build chỉ chạy được khi có nginx đứng trước.
  preview: {
    port: 8080,
    // Vite chặn Host lạ để chống DNS rebinding. Mở cho tunnel Cloudflare vì
    // đó là cách chia sẻ bản chạy thử khi chưa có server công khai.
    allowedHosts: ['.trycloudflare.com'],
    proxy: {
      '/api': {
        target: 'http://localhost:4100',
        changeOrigin: true,
      },
      '/uploads': {
        target: 'http://localhost:4100',
        changeOrigin: true,
      },
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
  },
});
