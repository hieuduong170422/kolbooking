import { randomUUID } from 'node:crypto';
import type { Db } from '../../shared/db/pool.js';
import type { SubmissionRepository } from './submission.repository.js';
import type {
  CreateRevisionInput,
  CreateSubmissionInput,
  PostingProof,
  RevisionRequest,
  Submission,
  SubmissionItem,
} from './submission.types.js';

interface SubmissionRow {
  readonly id: string;
  readonly booking_id: string;
  readonly version: number;
  readonly note: string;
  readonly items: readonly SubmissionItem[];
  readonly posting_proofs: readonly PostingProof[];
  readonly submitted_by_user_id: string;
  readonly created_at: string;
}

interface RevisionRow {
  readonly id: string;
  readonly booking_id: string;
  readonly submission_version: number;
  readonly reason: string;
  readonly requested_by_user_id: string;
  readonly created_at: string;
}

const SUBMISSION_COLUMNS =
  'id, booking_id, version, note, items, posting_proofs, submitted_by_user_id, created_at';
const REVISION_COLUMNS =
  'id, booking_id, submission_version, reason, requested_by_user_id, created_at';

/** Mã lỗi PostgreSQL cho vi phạm ràng buộc duy nhất. */
const UNIQUE_VIOLATION = '23505';
const MAX_VERSION_RETRIES = 3;

const toSubmission = (row: SubmissionRow): Submission => ({
  id: row.id,
  bookingId: row.booking_id,
  version: row.version,
  note: row.note,
  items: row.items,
  postingProofs: row.posting_proofs,
  submittedByUserId: row.submitted_by_user_id,
  createdAt: row.created_at,
});

const toRevision = (row: RevisionRow): RevisionRequest => ({
  id: row.id,
  bookingId: row.booking_id,
  submissionVersion: row.submission_version,
  reason: row.reason,
  requestedByUserId: row.requested_by_user_id,
  createdAt: row.created_at,
});

const isUniqueViolation = (error: unknown): boolean =>
  typeof error === 'object' && error !== null && (error as { code?: string }).code === UNIQUE_VIOLATION;

/** PostgreSQL implementation — lịch sử nộp bài append-only (DLV-004). */
export class PostgresSubmissionRepository implements SubmissionRepository {
  constructor(private readonly db: Db) {}

  /**
   * Version tính ngay trong câu INSERT (MAX + 1) nên không cần đọc trước rồi
   * ghi sau. Hai lượt nộp đồng thời cho cùng booking sẽ đụng unique index
   * (booking_id, version) — bản thua cuộc thử lại và nhận version kế tiếp.
   */
  async create(input: CreateSubmissionInput): Promise<Submission> {
    for (let attempt = 0; attempt < MAX_VERSION_RETRIES; attempt += 1) {
      try {
        const { rows } = await this.db.query<SubmissionRow>(
          `INSERT INTO submissions (${SUBMISSION_COLUMNS})
           SELECT $1, $2, COALESCE(MAX(version), 0) + 1, $3, $4, $5, $6, $7
           FROM submissions WHERE booking_id = $2
           RETURNING ${SUBMISSION_COLUMNS}`,
          [
            `sub_${randomUUID().replaceAll('-', '')}`,
            input.bookingId,
            input.note,
            JSON.stringify(input.items),
            JSON.stringify(input.postingProofs),
            input.submittedByUserId,
            new Date().toISOString(),
          ],
        );
        const row = rows[0];
        if (row) {
          return toSubmission(row);
        }
      } catch (error) {
        if (!isUniqueViolation(error)) {
          throw error;
        }
      }
    }
    throw new Error(
      `Không cấp được version mới cho booking ${input.bookingId} sau ${MAX_VERSION_RETRIES} lần thử.`,
    );
  }

  async listByBooking(bookingId: string): Promise<readonly Submission[]> {
    const { rows } = await this.db.query<SubmissionRow>(
      `SELECT ${SUBMISSION_COLUMNS} FROM submissions WHERE booking_id = $1 ORDER BY version ASC`,
      [bookingId],
    );
    return rows.map(toSubmission);
  }

  async latest(bookingId: string): Promise<Submission | null> {
    const { rows } = await this.db.query<SubmissionRow>(
      `SELECT ${SUBMISSION_COLUMNS} FROM submissions
       WHERE booking_id = $1
       ORDER BY version DESC
       LIMIT 1`,
      [bookingId],
    );
    const row = rows[0];
    return row ? toSubmission(row) : null;
  }

  async createRevision(input: CreateRevisionInput): Promise<RevisionRequest> {
    const revision: RevisionRequest = {
      id: `rev_${randomUUID().replaceAll('-', '')}`,
      bookingId: input.bookingId,
      submissionVersion: input.submissionVersion,
      reason: input.reason,
      requestedByUserId: input.requestedByUserId,
      createdAt: new Date().toISOString(),
    };
    await this.db.query(
      `INSERT INTO revision_requests (${REVISION_COLUMNS}) VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        revision.id,
        revision.bookingId,
        revision.submissionVersion,
        revision.reason,
        revision.requestedByUserId,
        revision.createdAt,
      ],
    );
    return revision;
  }

  async listRevisions(bookingId: string): Promise<readonly RevisionRequest[]> {
    const { rows } = await this.db.query<RevisionRow>(
      `SELECT ${REVISION_COLUMNS} FROM revision_requests
       WHERE booking_id = $1
       ORDER BY created_at ASC, id ASC`,
      [bookingId],
    );
    return rows.map(toRevision);
  }

  async countRevisions(bookingId: string): Promise<number> {
    const { rows } = await this.db.query<{ count: string }>(
      'SELECT COUNT(*) AS count FROM revision_requests WHERE booking_id = $1',
      [bookingId],
    );
    return Number(rows[0]?.count ?? 0);
  }
}
