import type { Db } from './pool.js';
import { SCHEMA_SQL } from './schema.js';

/**
 * Áp schema lên database. Toàn bộ câu lệnh trong SCHEMA_SQL đều idempotent nên
 * hàm này chạy được mỗi lần khởi động server, không cần công cụ migration
 * riêng ở giai đoạn MVP. Khi schema bắt đầu cần đổi cột/backfill, thay bằng
 * migration đánh số có bảng theo dõi phiên bản.
 */
export const migrate = async (db: Db): Promise<void> => {
  await db.query(SCHEMA_SQL);
};
