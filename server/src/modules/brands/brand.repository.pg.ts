import { randomUUID } from 'node:crypto';
import type { Db } from '../../shared/db/pool.js';
import type { BrandRepository } from './brand.repository.js';
import type { Brand, BrandStatus, BrandVerificationDoc } from './brand.types.js';

interface BrandRow {
  readonly data: Brand;
}

const COLUMN_NAMES = 'id, user_id, status, created_at, data';

const toColumns = (brand: Brand): readonly unknown[] => [
  brand.id,
  brand.userId,
  brand.status,
  brand.createdAt,
  JSON.stringify(brand),
];

/** PostgreSQL implementation của BrandRepository. */
export class PostgresBrandRepository implements BrandRepository {
  constructor(private readonly db: Db) {}

  /** Nạp hồ sơ brand có sẵn id — chỉ dùng cho seed. */
  async insertMany(brands: readonly Brand[]): Promise<void> {
    for (const brand of brands) {
      await this.db.query(
        `INSERT INTO brands (${COLUMN_NAMES}) VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (id) DO NOTHING`,
        toColumns(brand),
      );
    }
  }

  async findById(id: string): Promise<Brand | null> {
    const { rows } = await this.db.query<BrandRow>('SELECT data FROM brands WHERE id = $1', [id]);
    return rows[0]?.data ?? null;
  }

  async findByUserId(userId: string): Promise<Brand | null> {
    const { rows } = await this.db.query<BrandRow>('SELECT data FROM brands WHERE user_id = $1', [
      userId,
    ]);
    return rows[0]?.data ?? null;
  }

  async create(input: Brand): Promise<Brand> {
    const created: Brand = { ...input, id: `brd_${randomUUID().replaceAll('-', '')}` };
    await this.db.query(
      `INSERT INTO brands (${COLUMN_NAMES}) VALUES ($1, $2, $3, $4, $5)`,
      toColumns(created),
    );
    return created;
  }

  async update(id: string, input: Brand): Promise<Brand | null> {
    const updated: Brand = { ...input, id };
    const { rows } = await this.db.query<BrandRow>(
      `UPDATE brands SET user_id = $2, status = $3, created_at = $4, data = $5
       WHERE id = $1
       RETURNING data`,
      toColumns(updated),
    );
    return rows[0]?.data ?? null;
  }

  async findByStatus(statuses: readonly BrandStatus[]): Promise<readonly Brand[]> {
    // Cũ nhất lên đầu — hồ sơ chờ lâu phải được duyệt trước.
    const { rows } = await this.db.query<BrandRow>(
      'SELECT data FROM brands WHERE status = ANY($1) ORDER BY created_at ASC, id ASC',
      [statuses],
    );
    return rows.map((row) => row.data);
  }

  async addVerificationDoc(brandId: string, doc: BrandVerificationDoc): Promise<Brand | null> {
    const { rows } = await this.db.query<BrandRow>(
      `UPDATE brands
       SET data = jsonb_set(
         data,
         '{verificationDocs}',
         COALESCE(data->'verificationDocs', '[]'::jsonb) || $2::jsonb
       )
       WHERE id = $1
       RETURNING data`,
      [brandId, JSON.stringify([doc])],
    );
    return rows[0]?.data ?? null;
  }
}
