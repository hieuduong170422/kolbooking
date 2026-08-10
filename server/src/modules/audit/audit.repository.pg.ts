import { randomUUID } from 'node:crypto';
import { queryPage } from '../../shared/db/paginate.js';
import type { Db } from '../../shared/db/pool.js';
import type { AuditListFilter, AuditListResult, AuditRepository } from './audit.repository.js';
import type { AuditEntry, CreateAuditEntryInput } from './audit.types.js';

interface AuditRow {
  readonly id: string;
  readonly actor_id: string;
  readonly action: string;
  readonly target_type: string;
  readonly target_id: string;
  readonly before: unknown;
  readonly after: unknown;
  readonly reason: string | null;
  readonly created_at: string;
}

const COLUMNS =
  'id, actor_id, action, target_type, target_id, before, after, reason, created_at';

const toEntry = (row: AuditRow): AuditEntry => ({
  id: row.id,
  actorId: row.actor_id,
  action: row.action,
  targetType: row.target_type,
  targetId: row.target_id,
  before: row.before ?? null,
  after: row.after ?? null,
  reason: row.reason,
  createdAt: row.created_at,
});

/** JSON hóa giá trị tùy ý; undefined coi như không có dữ liệu. */
const toJsonColumn = (value: unknown): string | null =>
  value === null || value === undefined ? null : JSON.stringify(value);

/**
 * PostgreSQL implementation — append-only (BR-015: audit log không xóa cứng),
 * nên interface không có update/delete và ở đây cũng không có.
 *
 * Thứ tự đọc dựa trên cột `seq` (bigserial) chứ không dựa trên created_at:
 * nhiều thao tác trong cùng một mili giây vẫn phải giữ đúng thứ tự đã ghi.
 */
export class PostgresAuditRepository implements AuditRepository {
  constructor(private readonly db: Db) {}

  async create(input: CreateAuditEntryInput): Promise<AuditEntry> {
    const entry: AuditEntry = {
      id: `aud_${randomUUID()}`,
      actorId: input.actorId,
      action: input.action,
      targetType: input.targetType,
      targetId: input.targetId,
      before: input.before ?? null,
      after: input.after ?? null,
      reason: input.reason,
      createdAt: new Date().toISOString(),
    };
    await this.db.query(
      `INSERT INTO audit_entries (${COLUMNS}) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        entry.id,
        entry.actorId,
        entry.action,
        entry.targetType,
        entry.targetId,
        toJsonColumn(entry.before),
        toJsonColumn(entry.after),
        entry.reason,
        entry.createdAt,
      ],
    );
    return entry;
  }

  async listByTarget(targetType: string, targetId: string): Promise<readonly AuditEntry[]> {
    const { rows } = await this.db.query<AuditRow>(
      `SELECT ${COLUMNS} FROM audit_entries
       WHERE target_type = $1 AND target_id = $2
       ORDER BY seq ASC`,
      [targetType, targetId],
    );
    return rows.map(toEntry);
  }

  async listAll(): Promise<readonly AuditEntry[]> {
    const { rows } = await this.db.query<AuditRow>(
      `SELECT ${COLUMNS} FROM audit_entries ORDER BY seq ASC`,
    );
    return rows.map(toEntry);
  }

  async list(filter: AuditListFilter): Promise<AuditListResult> {
    const conditions: string[] = [];
    const values: unknown[] = [];

    if (filter.targetType) {
      values.push(filter.targetType);
      conditions.push(`target_type = $${values.length}`);
    }
    const action = filter.action?.trim();
    if (action) {
      // Khớp một phần tên action, vd "user." lấy mọi thao tác trên tài khoản.
      values.push(`%${action}%`);
      conditions.push(`action ILIKE $${values.length}`);
    }

    const page = await queryPage<AuditRow>(this.db, {
      select: COLUMNS,
      from: 'audit_entries',
      where: conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '',
      // Mới nhất lên đầu — audit đọc theo dòng thời gian ngược.
      orderBy: 'ORDER BY seq DESC',
      values,
      page: filter.page,
      limit: filter.limit,
    });

    return { items: page.rows.map(toEntry), total: page.total };
  }
}
