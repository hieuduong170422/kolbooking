import { randomUUID } from 'node:crypto';
import type { Db } from '../../shared/db/pool.js';
import type { VerificationTokenRepository } from './verification.repository.js';
import type {
  CreateVerificationTokenInput,
  VerificationPurpose,
  VerificationToken,
} from './verification.types.js';

interface TokenRow {
  readonly id: string;
  readonly user_id: string;
  readonly purpose: string;
  readonly code_hash: string;
  readonly expires_at: string;
  readonly consumed_at: string | null;
  readonly attempt_count: number;
  readonly created_at: string;
}

const COLUMNS =
  'id, user_id, purpose, code_hash, expires_at, consumed_at, attempt_count, created_at';

const toToken = (row: TokenRow): VerificationToken => ({
  id: row.id,
  userId: row.user_id,
  purpose: row.purpose as VerificationPurpose,
  codeHash: row.code_hash,
  expiresAt: row.expires_at,
  consumedAt: row.consumed_at,
  attemptCount: row.attempt_count,
  createdAt: row.created_at,
});

/** PostgreSQL implementation — chỉ lưu hash của OTP, không lưu mã gốc (SEC-009). */
export class PostgresVerificationTokenRepository implements VerificationTokenRepository {
  constructor(private readonly db: Db) {}

  async create(input: CreateVerificationTokenInput): Promise<VerificationToken> {
    const token: VerificationToken = {
      id: `vtk_${randomUUID()}`,
      userId: input.userId,
      purpose: input.purpose,
      codeHash: input.codeHash,
      expiresAt: input.expiresAt,
      consumedAt: null,
      attemptCount: 0,
      createdAt: new Date().toISOString(),
    };
    await this.db.query(
      `INSERT INTO verification_tokens (${COLUMNS}) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        token.id,
        token.userId,
        token.purpose,
        token.codeHash,
        token.expiresAt,
        token.consumedAt,
        token.attemptCount,
        token.createdAt,
      ],
    );
    return token;
  }

  async findLatestActive(
    userId: string,
    purpose: VerificationPurpose,
  ): Promise<VerificationToken | null> {
    const { rows } = await this.db.query<TokenRow>(
      `SELECT ${COLUMNS} FROM verification_tokens
       WHERE user_id = $1 AND purpose = $2 AND consumed_at IS NULL
       ORDER BY created_at DESC
       LIMIT 1`,
      [userId, purpose],
    );
    const row = rows[0];
    return row ? toToken(row) : null;
  }

  async markConsumed(id: string): Promise<void> {
    await this.db.query(
      'UPDATE verification_tokens SET consumed_at = $2 WHERE id = $1 AND consumed_at IS NULL',
      [id, new Date().toISOString()],
    );
  }

  async incrementAttempts(id: string): Promise<VerificationToken | null> {
    const { rows } = await this.db.query<TokenRow>(
      `UPDATE verification_tokens SET attempt_count = attempt_count + 1
       WHERE id = $1
       RETURNING ${COLUMNS}`,
      [id],
    );
    const row = rows[0];
    return row ? toToken(row) : null;
  }

  async invalidateAllFor(userId: string, purpose: VerificationPurpose): Promise<void> {
    await this.db.query(
      `UPDATE verification_tokens SET consumed_at = $3
       WHERE user_id = $1 AND purpose = $2 AND consumed_at IS NULL`,
      [userId, purpose, new Date().toISOString()],
    );
  }
}
