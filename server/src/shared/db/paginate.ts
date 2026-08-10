import type { QueryResultRow } from 'pg';
import type { Db } from './pool.js';

export interface PageQuery {
  /** Danh sách cột, không kèm từ khóa SELECT. */
  readonly select: string;
  /** Mệnh đề FROM, không kèm từ khóa FROM. */
  readonly from: string;
  /** Chuỗi rỗng hoặc "WHERE ..." — placeholder đánh số theo `values`. */
  readonly where: string;
  /** "ORDER BY ..." — bắt buộc để phân trang ổn định. */
  readonly orderBy: string;
  readonly values: readonly unknown[];
  readonly page: number;
  readonly limit: number;
}

export interface PageResult<Row> {
  readonly rows: readonly Row[];
  readonly total: number;
}

/**
 * Lấy một trang kèm tổng số bản ghi khớp điều kiện.
 *
 * Tổng lấy bằng COUNT(*) OVER() để chỉ tốn một lượt đi-về trong trường hợp
 * thường gặp. Khi trang vượt quá dữ liệu, truy vấn không trả row nào nên
 * không có window function để đọc — lúc đó mới chạy thêm một COUNT riêng.
 */
export const queryPage = async <Row extends QueryResultRow>(
  db: Db,
  query: PageQuery,
): Promise<PageResult<Row>> => {
  const values = [...query.values, query.limit, (query.page - 1) * query.limit];
  const limitPlaceholder = values.length - 1;
  const offsetPlaceholder = values.length;

  const { rows } = await db.query<Row & { total_count: string }>(
    `SELECT ${query.select}, COUNT(*) OVER() AS total_count
     FROM ${query.from}
     ${query.where}
     ${query.orderBy}
     LIMIT $${limitPlaceholder} OFFSET $${offsetPlaceholder}`,
    values,
  );

  const first = rows[0];
  if (first) {
    return { rows, total: Number(first.total_count) };
  }

  const { rows: countRows } = await db.query<{ count: string }>(
    `SELECT COUNT(*) AS count FROM ${query.from} ${query.where}`,
    query.values,
  );
  return { rows: [], total: Number(countRows[0]?.count ?? 0) };
};
