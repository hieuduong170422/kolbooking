import { randomUUID } from 'node:crypto';
import { queryPage } from '../../shared/db/paginate.js';
import type { Db } from '../../shared/db/pool.js';
import type { PackageRepository } from './package.repository.js';
import type {
  PackageAdminFilter,
  PackageListFilter,
  PackageListResult,
  ServicePackage,
} from './package.types.js';

interface PackageRow {
  readonly data: ServicePackage;
}

const COLUMN_NAMES = 'id, creator_id, status, price_vnd, created_at, updated_at, data';

const toColumns = (pkg: ServicePackage): readonly unknown[] => [
  pkg.id,
  pkg.creatorId,
  pkg.status,
  pkg.priceVnd,
  pkg.createdAt,
  pkg.updatedAt,
  JSON.stringify(pkg),
];

/** PostgreSQL implementation của PackageRepository. */
export class PostgresPackageRepository implements PackageRepository {
  constructor(private readonly db: Db) {}

  async findPublishedByCreator(filter: PackageListFilter): Promise<PackageListResult> {
    const page = await queryPage<PackageRow>(this.db, {
      select: 'data',
      from: 'packages',
      where: `WHERE creator_id = $1 AND status = 'published'`,
      // Rẻ trước — brand duyệt bảng giá từ thấp lên.
      orderBy: 'ORDER BY price_vnd ASC, id ASC',
      values: [filter.creatorId],
      page: filter.page,
      limit: filter.limit,
    });
    return { items: page.rows.map((row) => row.data), total: page.total };
  }

  async findAllByCreator(creatorId: string): Promise<readonly ServicePackage[]> {
    const { rows } = await this.db.query<PackageRow>(
      'SELECT data FROM packages WHERE creator_id = $1 ORDER BY created_at DESC, id ASC',
      [creatorId],
    );
    return rows.map((row) => row.data);
  }

  async findAllForAdmin(filter: PackageAdminFilter): Promise<PackageListResult> {
    const values: unknown[] = [];
    let where = '';
    if (filter.status) {
      values.push(filter.status);
      where = `WHERE status = $${values.length}`;
    }

    const page = await queryPage<PackageRow>(this.db, {
      select: 'data',
      from: 'packages',
      where,
      orderBy: 'ORDER BY updated_at DESC, id ASC',
      values,
      page: filter.page,
      limit: filter.limit,
    });
    return { items: page.rows.map((row) => row.data), total: page.total };
  }

  /** Nạp package có sẵn id — chỉ dùng cho seed (xem PostgresCreatorRepository). */
  async insertMany(packages: readonly ServicePackage[]): Promise<void> {
    for (const pkg of packages) {
      await this.db.query(
        `INSERT INTO packages (${COLUMN_NAMES}) VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (id) DO NOTHING`,
        toColumns(pkg),
      );
    }
  }

  async findById(id: string): Promise<ServicePackage | null> {
    const { rows } = await this.db.query<PackageRow>('SELECT data FROM packages WHERE id = $1', [
      id,
    ]);
    return rows[0]?.data ?? null;
  }

  async create(input: ServicePackage): Promise<ServicePackage> {
    const created: ServicePackage = { ...input, id: `pkg_${randomUUID().replaceAll('-', '')}` };
    await this.db.query(
      `INSERT INTO packages (${COLUMN_NAMES}) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      toColumns(created),
    );
    return created;
  }

  async update(id: string, input: ServicePackage): Promise<ServicePackage | null> {
    const updated: ServicePackage = { ...input, id };
    const { rows } = await this.db.query<PackageRow>(
      `UPDATE packages SET
         creator_id = $2, status = $3, price_vnd = $4, created_at = $5, updated_at = $6, data = $7
       WHERE id = $1
       RETURNING data`,
      toColumns(updated),
    );
    return rows[0]?.data ?? null;
  }

  async delete(id: string): Promise<boolean> {
    const { rowCount } = await this.db.query('DELETE FROM packages WHERE id = $1', [id]);
    return (rowCount ?? 0) > 0;
  }
}
