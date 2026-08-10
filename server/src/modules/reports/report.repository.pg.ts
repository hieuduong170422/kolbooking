import { randomUUID } from 'node:crypto';
import { queryPage } from '../../shared/db/paginate.js';
import type { Db } from '../../shared/db/pool.js';
import type { ReportRepository } from './report.repository.js';
import type {
  CreateReportInput,
  Report,
  ReportListFilter,
  ReportListResult,
  ReportReason,
  ReportStatus,
  ReportTargetType,
} from './report.types.js';

interface ReportRow {
  readonly id: string;
  readonly target_type: string;
  readonly target_id: string;
  readonly reason: string;
  readonly description: string;
  readonly reporter_user_id: string | null;
  readonly status: string;
  readonly resolution_note: string | null;
  readonly created_at: string;
  readonly resolved_at: string | null;
}

const COLUMNS =
  'id, target_type, target_id, reason, description, reporter_user_id, status, resolution_note, created_at, resolved_at';

const toReport = (row: ReportRow): Report => ({
  id: row.id,
  targetType: row.target_type as ReportTargetType,
  targetId: row.target_id,
  reason: row.reason as ReportReason,
  description: row.description,
  reporterUserId: row.reporter_user_id,
  status: row.status as ReportStatus,
  resolutionNote: row.resolution_note,
  createdAt: row.created_at,
  resolvedAt: row.resolved_at,
});

/** PostgreSQL implementation của ReportRepository. */
export class PostgresReportRepository implements ReportRepository {
  constructor(private readonly db: Db) {}

  async create(input: CreateReportInput): Promise<Report> {
    const report: Report = {
      id: `rpt_${randomUUID().replaceAll('-', '')}`,
      targetType: input.targetType,
      targetId: input.targetId,
      reason: input.reason,
      description: input.description,
      reporterUserId: input.reporterUserId,
      status: 'open',
      resolutionNote: null,
      createdAt: new Date().toISOString(),
      resolvedAt: null,
    };
    await this.db.query(
      `INSERT INTO reports (${COLUMNS}) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        report.id,
        report.targetType,
        report.targetId,
        report.reason,
        report.description,
        report.reporterUserId,
        report.status,
        report.resolutionNote,
        report.createdAt,
        report.resolvedAt,
      ],
    );
    return report;
  }

  async findById(id: string): Promise<Report | null> {
    const { rows } = await this.db.query<ReportRow>(
      `SELECT ${COLUMNS} FROM reports WHERE id = $1`,
      [id],
    );
    const row = rows[0];
    return row ? toReport(row) : null;
  }

  async list(filter: ReportListFilter): Promise<ReportListResult> {
    const values: unknown[] = [];
    let where = '';
    if (filter.status) {
      values.push(filter.status);
      where = `WHERE status = $${values.length}`;
    }

    const page = await queryPage<ReportRow>(this.db, {
      select: COLUMNS,
      from: 'reports',
      where,
      // Cũ nhất lên đầu — ticket chờ lâu phải xử lý trước (SLA, DSP-008).
      orderBy: 'ORDER BY created_at ASC, id ASC',
      values,
      page: filter.page,
      limit: filter.limit,
    });

    return { items: page.rows.map(toReport), total: page.total };
  }

  async resolve(id: string, status: ReportStatus, note: string): Promise<Report | null> {
    const { rows } = await this.db.query<ReportRow>(
      `UPDATE reports SET status = $2, resolution_note = $3, resolved_at = $4
       WHERE id = $1
       RETURNING ${COLUMNS}`,
      [id, status, note, new Date().toISOString()],
    );
    const row = rows[0];
    return row ? toReport(row) : null;
  }
}
