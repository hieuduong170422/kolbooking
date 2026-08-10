import { randomUUID } from 'node:crypto';
import { queryPage } from '../../shared/db/paginate.js';
import type { Db } from '../../shared/db/pool.js';
import type { CreatorRepository } from './creator.repository.js';
import type {
  Creator,
  CreatorListFilter,
  CreatorListResult,
  CreatorSortOption,
  CreatorStatus,
  PortfolioItem,
} from './creator.types.js';

interface CreatorRow {
  readonly data: Creator;
}

/**
 * Cột phẳng chỉ phục vụ lọc/sắp xếp; `data` mới là nguồn sự thật khi đọc.
 * Ghi luôn đi qua hàm này để hai bên không lệch nhau.
 */
const toColumns = (creator: Creator): readonly unknown[] => [
  creator.id,
  creator.userId,
  creator.displayName,
  creator.bio,
  creator.city,
  creator.niches,
  creator.socialAccounts.map((account) => account.platform),
  creator.creatorType,
  creator.serviceMode,
  creator.status,
  creator.priceFromVnd,
  creator.rating,
  creator.completedBookings,
  creator.createdAt,
  JSON.stringify(creator),
];

const COLUMN_NAMES =
  'id, user_id, display_name, bio, city, niches, platforms, creator_type, service_mode, status, price_from_vnd, rating, completed_bookings, created_at, data';

const ORDER_BY: Record<CreatorSortOption, string> = {
  rating: 'rating DESC',
  price_asc: 'price_from_vnd ASC',
  price_desc: 'price_from_vnd DESC',
  newest: 'created_at DESC',
  completed: 'completed_bookings DESC',
};

/** PostgreSQL implementation của CreatorRepository. */
export class PostgresCreatorRepository implements CreatorRepository {
  constructor(private readonly db: Db) {}

  async findAll(filter: CreatorListFilter): Promise<CreatorListResult> {
    // Danh sách công khai chỉ hiện hồ sơ đã duyệt (BR-001).
    const conditions: string[] = [`status = 'verified'`];
    const values: unknown[] = [];

    if (filter.search) {
      values.push(`%${filter.search}%`);
      const placeholder = `$${values.length}`;
      conditions.push(
        `(display_name ILIKE ${placeholder} OR bio ILIKE ${placeholder}
          OR EXISTS (SELECT 1 FROM unnest(niches) AS niche WHERE niche ILIKE ${placeholder}))`,
      );
    }
    if (filter.city) {
      values.push(filter.city);
      conditions.push(`lower(city) = lower($${values.length})`);
    }
    if (filter.creatorType) {
      values.push(filter.creatorType);
      conditions.push(`creator_type = $${values.length}`);
    }
    if (filter.platform) {
      values.push(filter.platform);
      conditions.push(`$${values.length} = ANY(platforms)`);
    }
    if (filter.serviceMode) {
      // Creator nhận cả hai hình thức thì khớp mọi bộ lọc hình thức (CRE-006).
      values.push(filter.serviceMode);
      conditions.push(`(service_mode = $${values.length} OR service_mode = 'both')`);
    }
    if (filter.minPriceVnd !== undefined) {
      values.push(filter.minPriceVnd);
      conditions.push(`price_from_vnd >= $${values.length}`);
    }
    if (filter.maxPriceVnd !== undefined) {
      values.push(filter.maxPriceVnd);
      conditions.push(`price_from_vnd <= $${values.length}`);
    }
    if (filter.minRating !== undefined) {
      values.push(filter.minRating);
      conditions.push(`rating >= $${values.length}`);
    }

    const page = await queryPage<CreatorRow>(this.db, {
      select: 'data',
      from: 'creators',
      where: `WHERE ${conditions.join(' AND ')}`,
      // Thêm id làm khóa phụ để hai bản ghi bằng điểm không đổi chỗ giữa các trang.
      orderBy: `ORDER BY ${ORDER_BY[filter.sort]}, id ASC`,
      values,
      page: filter.page,
      limit: filter.limit,
    });

    return { items: page.rows.map((row) => row.data), total: page.total };
  }

  /**
   * Nạp hồ sơ có sẵn id — dùng cho seed, KHÔNG thuộc CreatorRepository vì
   * nghiệp vụ không bao giờ được tự chọn id. Bản ghi trùng id bị bỏ qua.
   */
  async insertMany(creators: readonly Creator[]): Promise<void> {
    for (const creator of creators) {
      await this.db.query(
        `INSERT INTO creators (${COLUMN_NAMES})
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
         ON CONFLICT (id) DO NOTHING`,
        toColumns(creator),
      );
    }
  }

  async findById(id: string): Promise<Creator | null> {
    const { rows } = await this.db.query<CreatorRow>('SELECT data FROM creators WHERE id = $1', [
      id,
    ]);
    return rows[0]?.data ?? null;
  }

  async findByUserId(userId: string): Promise<Creator | null> {
    const { rows } = await this.db.query<CreatorRow>(
      'SELECT data FROM creators WHERE user_id = $1',
      [userId],
    );
    return rows[0]?.data ?? null;
  }

  async create(input: Creator): Promise<Creator> {
    const created: Creator = { ...input, id: `crt_${randomUUID()}` };
    await this.db.query(
      `INSERT INTO creators (${COLUMN_NAMES})
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)`,
      toColumns(created),
    );
    return created;
  }

  async update(id: string, input: Creator): Promise<Creator | null> {
    const updated: Creator = { ...input, id };
    const { rows } = await this.db.query<CreatorRow>(
      `UPDATE creators SET
         user_id = $2, display_name = $3, bio = $4, city = $5, niches = $6, platforms = $7,
         creator_type = $8, service_mode = $9, status = $10, price_from_vnd = $11, rating = $12,
         completed_bookings = $13, created_at = $14, data = $15
       WHERE id = $1
       RETURNING data`,
      toColumns(updated),
    );
    return rows[0]?.data ?? null;
  }

  async findByStatusForReview(statuses: readonly CreatorStatus[]): Promise<readonly Creator[]> {
    const { rows } = await this.db.query<CreatorRow>(
      'SELECT data FROM creators WHERE status = ANY($1) ORDER BY created_at ASC, id ASC',
      [statuses],
    );
    return rows.map((row) => row.data);
  }

  findForReviewById(id: string): Promise<Creator | null> {
    // Admin xem mọi trạng thái — cùng truy vấn với findById, khác ở tầng quyền.
    return this.findById(id);
  }

  async addPortfolioItem(creatorId: string, item: PortfolioItem): Promise<Creator | null> {
    const { rows } = await this.db.query<CreatorRow>(
      `UPDATE creators
       SET data = jsonb_set(
         data,
         '{portfolioItems}',
         COALESCE(data->'portfolioItems', '[]'::jsonb) || $2::jsonb
       )
       WHERE id = $1
       RETURNING data`,
      [creatorId, JSON.stringify([item])],
    );
    return rows[0]?.data ?? null;
  }

  async removePortfolioItem(creatorId: string, itemId: string): Promise<Creator | null> {
    // Item không tồn tại → hồ sơ giữ nguyên (idempotent, giống bản in-memory).
    const { rows } = await this.db.query<CreatorRow>(
      `UPDATE creators
       SET data = jsonb_set(
         data,
         '{portfolioItems}',
         COALESCE(
           (SELECT jsonb_agg(item)
            FROM jsonb_array_elements(COALESCE(data->'portfolioItems', '[]'::jsonb)) AS item
            WHERE item->>'id' IS DISTINCT FROM $2),
           '[]'::jsonb
         )
       )
       WHERE id = $1
       RETURNING data`,
      [creatorId, itemId],
    );
    return rows[0]?.data ?? null;
  }
}
