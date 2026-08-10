import type { Db } from '../../shared/db/pool.js';
import type { RefreshSession, SessionRepository } from './session.repository.js';

interface SessionRow {
  readonly token_hash: string;
  readonly user_id: string;
  readonly expires_at: string;
  readonly revoked_at: string | null;
}

const toSession = (row: SessionRow): RefreshSession => ({
  tokenHash: row.token_hash,
  userId: row.user_id,
  expiresAt: row.expires_at,
  revokedAt: row.revoked_at,
});

/** PostgreSQL implementation — chỉ lưu hash của refresh token (SEC-009). */
export class PostgresSessionRepository implements SessionRepository {
  constructor(private readonly db: Db) {}

  async create(session: RefreshSession): Promise<void> {
    await this.db.query(
      `INSERT INTO refresh_sessions (token_hash, user_id, expires_at, revoked_at)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (token_hash) DO UPDATE
         SET user_id = EXCLUDED.user_id,
             expires_at = EXCLUDED.expires_at,
             revoked_at = EXCLUDED.revoked_at`,
      [session.tokenHash, session.userId, session.expiresAt, session.revokedAt],
    );
  }

  async findByTokenHash(tokenHash: string): Promise<RefreshSession | null> {
    const { rows } = await this.db.query<SessionRow>(
      'SELECT token_hash, user_id, expires_at, revoked_at FROM refresh_sessions WHERE token_hash = $1',
      [tokenHash],
    );
    const row = rows[0];
    return row ? toSession(row) : null;
  }

  async revoke(tokenHash: string): Promise<void> {
    // Chỉ ghi lần thu hồi đầu tiên — giữ nguyên mốc thời gian gốc.
    await this.db.query(
      'UPDATE refresh_sessions SET revoked_at = $2 WHERE token_hash = $1 AND revoked_at IS NULL',
      [tokenHash, new Date().toISOString()],
    );
  }

  async revokeAllForUser(userId: string): Promise<void> {
    await this.db.query(
      'UPDATE refresh_sessions SET revoked_at = $2 WHERE user_id = $1 AND revoked_at IS NULL',
      [userId, new Date().toISOString()],
    );
  }
}
