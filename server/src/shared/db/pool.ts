import pg from 'pg';

/**
 * Kiểu tối thiểu mà repository cần — Pool hay PoolClient đều thỏa.
 * Repository phụ thuộc interface này để test có thể truyền client trong
 * transaction, và để không kéo cả bề mặt API của Pool vào tầng domain.
 */
export interface Db {
  query<Row extends pg.QueryResultRow = pg.QueryResultRow>(
    queryText: string,
    values?: readonly unknown[],
  ): Promise<pg.QueryResult<Row>>;
}

/**
 * pg là package CommonJS: named import hoạt động không ổn định khi Node chạy
 * ESM thuần, nên lấy qua default export.
 */
const { Pool } = pg;

export interface PoolOptions {
  readonly connectionString: string;
  readonly max: number;
  /**
   * Schema mặc định cho mọi kết nối của pool. Bỏ trống dùng `public`.
   * Test dùng tham số này để mỗi tiến trình chạy trong một schema riêng, nhờ
   * đó nhiều file test song song không dọn bảng của nhau.
   */
  readonly schema?: string;
}

export const createPool = ({ connectionString, max, schema }: PoolOptions): pg.Pool =>
  new Pool({
    connectionString,
    max,
    ...(schema ? { options: `-c search_path=${schema}` } : {}),
    // Trả kết nối rỗi về hệ điều hành thay vì giữ mãi — server chạy lâu ngày
    // với lưu lượng thấp không nên ôm connection.
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
  });

export type { Pool } from 'pg';
