import { randomUUID } from 'node:crypto';
import type { Db } from '../../shared/db/pool.js';
import type { ConversationRepository } from './conversation.repository.js';
import type { Conversation, CreateConversationInput } from './conversation.types.js';

interface ConversationRow {
  readonly id: string;
  readonly brand_user_id: string;
  readonly creator_id: string;
  readonly creator_user_id: string | null;
  readonly created_at: string;
  readonly last_message_at: string | null;
}

const COLUMNS = 'id, brand_user_id, creator_id, creator_user_id, created_at, last_message_at';

const toConversation = (row: ConversationRow): Conversation => ({
  id: row.id,
  brandUserId: row.brand_user_id,
  creatorId: row.creator_id,
  creatorUserId: row.creator_user_id,
  createdAt: row.created_at,
  lastMessageAt: row.last_message_at,
});

/** Luồng có tin mới nhất lên đầu; luồng chưa có tin xếp theo ngày tạo. */
const ORDER_BY = 'ORDER BY COALESCE(last_message_at, created_at) DESC, id ASC';

/** PostgreSQL implementation — cặp (brand, creator) là khóa duy nhất (OD-09). */
export class PostgresConversationRepository implements ConversationRepository {
  constructor(private readonly db: Db) {}

  async findByPair(brandUserId: string, creatorId: string): Promise<Conversation | null> {
    const { rows } = await this.db.query<ConversationRow>(
      `SELECT ${COLUMNS} FROM conversations WHERE brand_user_id = $1 AND creator_id = $2`,
      [brandUserId, creatorId],
    );
    const row = rows[0];
    return row ? toConversation(row) : null;
  }

  async findById(id: string): Promise<Conversation | null> {
    const { rows } = await this.db.query<ConversationRow>(
      `SELECT ${COLUMNS} FROM conversations WHERE id = $1`,
      [id],
    );
    const row = rows[0];
    return row ? toConversation(row) : null;
  }

  async create(input: CreateConversationInput): Promise<Conversation> {
    const conversation: Conversation = {
      id: `cnv_${randomUUID().replaceAll('-', '')}`,
      brandUserId: input.brandUserId,
      creatorId: input.creatorId,
      creatorUserId: input.creatorUserId,
      createdAt: new Date().toISOString(),
      lastMessageAt: null,
    };
    // Hai request song song cùng mở luồng cho một cặp: giữ bản ghi đã có,
    // trả về đúng luồng đó thay vì vỡ vì trùng khóa.
    const { rows } = await this.db.query<ConversationRow>(
      `INSERT INTO conversations (${COLUMNS}) VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (brand_user_id, creator_id) DO UPDATE SET creator_user_id = conversations.creator_user_id
       RETURNING ${COLUMNS}`,
      [
        conversation.id,
        conversation.brandUserId,
        conversation.creatorId,
        conversation.creatorUserId,
        conversation.createdAt,
        conversation.lastMessageAt,
      ],
    );
    const row = rows[0];
    return row ? toConversation(row) : conversation;
  }

  async touch(id: string, at: string): Promise<void> {
    await this.db.query('UPDATE conversations SET last_message_at = $2 WHERE id = $1', [id, at]);
  }

  async listByBrand(brandUserId: string): Promise<readonly Conversation[]> {
    const { rows } = await this.db.query<ConversationRow>(
      `SELECT ${COLUMNS} FROM conversations WHERE brand_user_id = $1 ${ORDER_BY}`,
      [brandUserId],
    );
    return rows.map(toConversation);
  }

  async listByCreator(creatorId: string): Promise<readonly Conversation[]> {
    const { rows } = await this.db.query<ConversationRow>(
      `SELECT ${COLUMNS} FROM conversations WHERE creator_id = $1 ${ORDER_BY}`,
      [creatorId],
    );
    return rows.map(toConversation);
  }
}
