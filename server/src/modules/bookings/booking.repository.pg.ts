import { randomUUID } from 'node:crypto';
import { queryPage } from '../../shared/db/paginate.js';
import type { Db } from '../../shared/db/pool.js';
import type { BookingRepository } from './booking.repository.js';
import type { Booking, BookingListFilter, BookingListResult } from './booking.types.js';

interface BookingRow {
  readonly data: Booking;
}

/** Trạng thái còn "sống" — chỉ những trạng thái này mới bị hết hạn (BKG-005). */
const EXPIRABLE_STATUSES = ['pending_creator', 'awaiting_payment'];

const COLUMN_NAMES =
  'id, code, brand_user_id, creator_id, creator_user_id, package_id, status, expires_at, created_at, updated_at, data';

const toColumns = (booking: Booking): readonly unknown[] => [
  booking.id,
  booking.code,
  booking.brandUserId,
  booking.creatorId,
  booking.creatorUserId,
  booking.packageId,
  booking.status,
  booking.expiresAt,
  booking.createdAt,
  booking.updatedAt,
  JSON.stringify(booking),
];

/** PostgreSQL implementation của BookingRepository. */
export class PostgresBookingRepository implements BookingRepository {
  constructor(private readonly db: Db) {}

  async create(input: Booking): Promise<Booking> {
    const created: Booking = { ...input, id: `bkg_${randomUUID().replaceAll('-', '')}` };
    await this.db.query(
      `INSERT INTO bookings (${COLUMN_NAMES})
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      toColumns(created),
    );
    return created;
  }

  async findById(id: string): Promise<Booking | null> {
    const { rows } = await this.db.query<BookingRow>('SELECT data FROM bookings WHERE id = $1', [
      id,
    ]);
    return rows[0]?.data ?? null;
  }

  async findByCode(code: string): Promise<Booking | null> {
    const { rows } = await this.db.query<BookingRow>('SELECT data FROM bookings WHERE code = $1', [
      code,
    ]);
    return rows[0]?.data ?? null;
  }

  async update(id: string, input: Booking): Promise<Booking | null> {
    const updated: Booking = { ...input, id };
    const { rows } = await this.db.query<BookingRow>(
      `UPDATE bookings SET
         code = $2, brand_user_id = $3, creator_id = $4, creator_user_id = $5, package_id = $6,
         status = $7, expires_at = $8, created_at = $9, updated_at = $10, data = $11
       WHERE id = $1
       RETURNING data`,
      toColumns(updated),
    );
    return rows[0]?.data ?? null;
  }

  findByBrand(brandUserId: string, filter: BookingListFilter): Promise<BookingListResult> {
    return this.paginate('brand_user_id = $1', [brandUserId], filter);
  }

  findByCreator(creatorId: string, filter: BookingListFilter): Promise<BookingListResult> {
    return this.paginate('creator_id = $1', [creatorId], filter);
  }

  findAll(filter: BookingListFilter): Promise<BookingListResult> {
    return this.paginate('', [], filter);
  }

  async findExpired(now: string): Promise<readonly Booking[]> {
    const { rows } = await this.db.query<BookingRow>(
      `SELECT data FROM bookings
       WHERE status = ANY($1) AND expires_at IS NOT NULL AND expires_at <= $2`,
      [EXPIRABLE_STATUSES, now],
    );
    return rows.map((row) => row.data);
  }

  private async paginate(
    scope: string,
    scopeValues: readonly unknown[],
    filter: BookingListFilter,
  ): Promise<BookingListResult> {
    const conditions = scope ? [scope] : [];
    const values = [...scopeValues];

    if (filter.status) {
      values.push(filter.status);
      conditions.push(`status = $${values.length}`);
    }

    const page = await queryPage<BookingRow>(this.db, {
      select: 'data',
      from: 'bookings',
      where: conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '',
      // Mới cập nhật lên đầu — người dùng quan tâm booking vừa có thay đổi.
      orderBy: 'ORDER BY updated_at DESC, id ASC',
      values,
      page: filter.page,
      limit: filter.limit,
    });

    return { items: page.rows.map((row) => row.data), total: page.total };
  }
}
