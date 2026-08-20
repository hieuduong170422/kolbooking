import type { Express } from 'express';
import type { Server } from 'node:http';

/**
 * Sổ theo dõi các server test đang mở. Module này CỐ Ý không import gì từ
 * src/ — `setup.ts` nạp nó cho mọi file test, kéo theo cả đồ thị module của
 * ứng dụng vào bước setup thì chậm mà chẳng để làm gì.
 */
const openServers = new Set<Server>();

/** Mở cổng ngẫu nhiên cho một Express app và ghi sổ để dọn sau. */
export const listenTestApp = (app: Express): Server => {
  const server = app.listen(0);
  openServers.add(server);
  return server;
};

const close = (server: Server): Promise<void> =>
  new Promise((resolve) => {
    // Đóng cả kết nối keep-alive đang mở: server.close() chỉ ngừng nhận kết
    // nối MỚI rồi chờ kết nối cũ tự kết thúc, nên thiếu dòng này thì afterAll
    // treo tới lúc socket hết hạn.
    server.closeAllConnections();
    server.close(() => resolve());
  });

/**
 * Đóng mọi server đã mở. Gọi tự động ở afterAll của MỌI file test (xem
 * `setupFiles` trong vitest.config.ts) nên file test không phải tự dọn.
 *
 * Đóng ở afterAll chứ không phải afterEach: có file dựng app một lần ở module
 * scope hoặc beforeAll rồi dùng cho cả file — dọn sau mỗi test sẽ rút thảm
 * dưới chân chúng.
 */
export const closeAllTestServers = async (): Promise<void> => {
  const servers = [...openServers];
  openServers.clear();
  await Promise.all(servers.map(close));
};
