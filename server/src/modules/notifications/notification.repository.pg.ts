import { randomUUID } from 'node:crypto';
import { queryPage } from '../../shared/db/paginate.js';
import type { Db } from '../../shared/db/pool.js';
import type { NotificationRepository } from './notification.repository.js';
import type {
  CreateNotificationInput,
  Notification,
  NotificationListFilter,
  NotificationListResult,
  NotificationType,
} from './notification.types.js';

interface NotificationRow {
  readonly id: string;
  readonly user_id: string;
  readonly type: string;
  readonly title: string;
  readonly body: string;
  readonly link: string;
  readonly read_at: string | null;
  readonly created_at: string;
}

const COLUMNS = 'id, user_id, type, title, body, link, read_at, created_at';

const toNotification = (row: NotificationRow): Notification => ({
  id: row.id,
  userId: row.user_id,
  type: row.type as NotificationType,
  title: row.title,
  body: row.body,
  link: row.link,
  readAt: row.read_at,
  createdAt: row.created_at,
});

/** PostgreSQL implementation của NotificationRepository. */
export class PostgresNotificationRepository implements NotificationRepository {
  constructor(private readonly db: Db) {}

  async create(input: CreateNotificationInput): Promise<Notification> {
    const notification: Notification = {
      id: `ntf_${randomUUID().replaceAll('-', '')}`,
      userId: input.userId,
      type: input.type,
      title: input.title,
      body: input.body,
      link: input.link,
      readAt: null,
      createdAt: new Date().toISOString(),
    };
    await this.db.query(
      `INSERT INTO notifications (${COLUMNS}) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        notification.id,
        notification.userId,
        notification.type,
        notification.title,
        notification.body,
        notification.link,
        notification.readAt,
        notification.createdAt,
      ],
    );
    return notification;
  }

  async list(filter: NotificationListFilter): Promise<NotificationListResult> {
    const where = filter.unreadOnly
      ? 'WHERE user_id = $1 AND read_at IS NULL'
      : 'WHERE user_id = $1';

    const page = await queryPage<NotificationRow>(this.db, {
      select: COLUMNS,
      from: 'notifications',
      where,
      // Mới nhất lên đầu.
      orderBy: 'ORDER BY created_at DESC, id ASC',
      values: [filter.userId],
      page: filter.page,
      limit: filter.limit,
    });

    return {
      items: page.rows.map(toNotification),
      total: page.total,
      // Số chưa đọc tính trên toàn bộ thông báo của user, không theo bộ lọc:
      // chuông hiển thị cùng con số dù đang xem tab nào.
      unreadCount: await this.countUnread(filter.userId),
    };
  }

  async markRead(id: string, userId: string): Promise<Notification | null> {
    const { rows } = await this.db.query<NotificationRow>(
      `UPDATE notifications SET read_at = COALESCE(read_at, $3)
       WHERE id = $1 AND user_id = $2
       RETURNING ${COLUMNS}`,
      [id, userId, new Date().toISOString()],
    );
    const row = rows[0];
    return row ? toNotification(row) : null;
  }

  async markAllRead(userId: string): Promise<number> {
    const { rowCount } = await this.db.query(
      'UPDATE notifications SET read_at = $2 WHERE user_id = $1 AND read_at IS NULL',
      [userId, new Date().toISOString()],
    );
    return rowCount ?? 0;
  }

  async countUnread(userId: string): Promise<number> {
    const { rows } = await this.db.query<{ count: string }>(
      'SELECT COUNT(*) AS count FROM notifications WHERE user_id = $1 AND read_at IS NULL',
      [userId],
    );
    return Number(rows[0]?.count ?? 0);
  }
}
