import { randomUUID } from 'node:crypto';
import { queryPage } from '../../shared/db/paginate.js';
import type { Db } from '../../shared/db/pool.js';
import type { MessageRepository } from './message.repository.js';
import type {
  CreateMessageInput,
  Message,
  MessageListFilter,
  MessageListResult,
  MessageSenderRole,
  MessageType,
} from './message.types.js';

interface MessageRow {
  readonly id: string;
  readonly conversation_id: string;
  readonly booking_id: string | null;
  readonly sender_user_id: string;
  readonly sender_role: string;
  readonly type: string;
  readonly body: string;
  readonly file_url: string | null;
  readonly file_name: string | null;
  readonly read_by_user_ids: string[];
  readonly off_platform_flagged: boolean;
  readonly deleted_at: string | null;
  readonly created_at: string;
}

const COLUMNS =
  'id, conversation_id, booking_id, sender_user_id, sender_role, type, body, file_url, file_name, read_by_user_ids, off_platform_flagged, deleted_at, created_at';

const toMessage = (row: MessageRow): Message => ({
  id: row.id,
  conversationId: row.conversation_id,
  bookingId: row.booking_id,
  senderUserId: row.sender_user_id,
  senderRole: row.sender_role as MessageSenderRole,
  type: row.type as MessageType,
  body: row.body,
  fileUrl: row.file_url,
  fileName: row.file_name,
  readByUserIds: row.read_by_user_ids,
  offPlatformFlagged: row.off_platform_flagged,
  deletedAt: row.deleted_at,
  createdAt: row.created_at,
});

/** PostgreSQL implementation của MessageRepository. */
export class PostgresMessageRepository implements MessageRepository {
  constructor(private readonly db: Db) {}

  async create(input: CreateMessageInput): Promise<Message> {
    const message: Message = {
      id: `msg_${randomUUID().replaceAll('-', '')}`,
      conversationId: input.conversationId,
      bookingId: input.bookingId,
      senderUserId: input.senderUserId,
      senderRole: input.senderRole,
      type: input.type,
      body: input.body,
      fileUrl: input.fileUrl,
      fileName: input.fileName,
      // Người gửi mặc nhiên đã đọc tin của chính mình.
      readByUserIds: [input.senderUserId],
      offPlatformFlagged: input.offPlatformFlagged,
      deletedAt: null,
      createdAt: new Date().toISOString(),
    };
    await this.db.query(
      `INSERT INTO messages (${COLUMNS})
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
      [
        message.id,
        message.conversationId,
        message.bookingId,
        message.senderUserId,
        message.senderRole,
        message.type,
        message.body,
        message.fileUrl,
        message.fileName,
        message.readByUserIds,
        message.offPlatformFlagged,
        message.deletedAt,
        message.createdAt,
      ],
    );
    return message;
  }

  async findById(id: string): Promise<Message | null> {
    const { rows } = await this.db.query<MessageRow>(
      `SELECT ${COLUMNS} FROM messages WHERE id = $1`,
      [id],
    );
    const row = rows[0];
    return row ? toMessage(row) : null;
  }

  async listByConversation(filter: MessageListFilter): Promise<MessageListResult> {
    const page = await queryPage<MessageRow>(this.db, {
      select: COLUMNS,
      from: 'messages',
      where: 'WHERE conversation_id = $1',
      // Cũ trước — thread đọc theo thứ tự thời gian.
      orderBy: 'ORDER BY created_at ASC, id ASC',
      values: [filter.conversationId],
      page: filter.page,
      limit: filter.limit,
    });
    return { items: page.rows.map(toMessage), total: page.total };
  }

  async markRead(conversationId: string, userId: string): Promise<number> {
    const { rowCount } = await this.db.query(
      `UPDATE messages SET read_by_user_ids = array_append(read_by_user_ids, $2)
       WHERE conversation_id = $1 AND NOT ($2 = ANY(read_by_user_ids))`,
      [conversationId, userId],
    );
    return rowCount ?? 0;
  }

  async softDelete(id: string): Promise<Message | null> {
    // Xóa mềm — giữ bản ghi để phân xử (CHAT-006, BR-015).
    const { rows } = await this.db.query<MessageRow>(
      `UPDATE messages SET deleted_at = $2 WHERE id = $1 RETURNING ${COLUMNS}`,
      [id, new Date().toISOString()],
    );
    const row = rows[0];
    return row ? toMessage(row) : null;
  }

  async countUnread(conversationId: string, userId: string): Promise<number> {
    const { rows } = await this.db.query<{ count: string }>(
      `SELECT COUNT(*) AS count FROM messages
       WHERE conversation_id = $1 AND NOT ($2 = ANY(read_by_user_ids))`,
      [conversationId, userId],
    );
    return Number(rows[0]?.count ?? 0);
  }
}
