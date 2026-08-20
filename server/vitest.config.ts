import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    /**
     * Chạy lại MỘT lần khi một test đỏ.
     *
     * Lý do: mỗi test API gọi `request(app)` và supertest dựng một server
     * ephemeral riêng cho TỪNG request — cả suite tạo hàng nghìn vòng
     * listen/close. Thỉnh thoảng (khoảng 1/6 lần chạy full suite) một request
     * đỏ ở tầng vận chuyển: `read ECONNRESET`, hoặc endpoint public trả 401
     * dù route đó không hề có requireAuth — tức là response của socket khác.
     * Lỗi nhảy lung tung giữa các file và KHÔNG BAO GIỜ tái hiện khi chạy
     * riêng file đó; đã thử hạ maxWorkers xuống 4 rồi 2, không đỡ.
     *
     * Retry chỉ che được lỗi vận chuyển ngẫu nhiên: bug thật vẫn đỏ cả hai
     * lần. Nếu thấy một test đỏ lặp lại thì đó là bug thật, đừng tăng số
     * retry — hãy sửa. Cách chữa tận gốc là dùng chung một server cho cả file
     * (`app.listen(0)` ở beforeAll) thay vì để supertest dựng lại mỗi request.
     */
    retry: 1,
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: ['src/index.ts'],
    },
  },
});
