import type { Db } from '../../shared/db/pool.js';
import type { FavoriteRepository } from './favorite.repository.js';

/** PostgreSQL implementation — khóa chính là cặp (user_id, creator_id). */
export class PostgresFavoriteRepository implements FavoriteRepository {
  constructor(private readonly db: Db) {}

  async add(userId: string, creatorId: string): Promise<void> {
    // Idempotent: lưu lại creator đã lưu không đổi mốc thời gian ban đầu.
    await this.db.query(
      `INSERT INTO favorites (user_id, creator_id, created_at)
       VALUES ($1, $2, $3)
       ON CONFLICT (user_id, creator_id) DO NOTHING`,
      [userId, creatorId, new Date().toISOString()],
    );
  }

  async remove(userId: string, creatorId: string): Promise<void> {
    await this.db.query('DELETE FROM favorites WHERE user_id = $1 AND creator_id = $2', [
      userId,
      creatorId,
    ]);
  }

  async listCreatorIds(userId: string): Promise<readonly string[]> {
    const { rows } = await this.db.query<{ creator_id: string }>(
      'SELECT creator_id FROM favorites WHERE user_id = $1 ORDER BY created_at DESC',
      [userId],
    );
    return rows.map((row) => row.creator_id);
  }

  async has(userId: string, creatorId: string): Promise<boolean> {
    const { rows } = await this.db.query(
      'SELECT 1 FROM favorites WHERE user_id = $1 AND creator_id = $2',
      [userId, creatorId],
    );
    return rows.length > 0;
  }
}
