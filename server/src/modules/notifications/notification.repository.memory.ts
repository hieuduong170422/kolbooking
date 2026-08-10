import { randomUUID } from 'node:crypto';
import type { NotificationRepository } from './notification.repository.js';
import type {
  CreateNotificationInput,
  Notification,
  NotificationListFilter,
  NotificationListResult,
} from './notification.types.js';

/** In-memory implementation — bản ghi immutable, luôn trả bản copy. */
export class InMemoryNotificationRepository implements NotificationRepository {
  private readonly notificationsById = new Map<string, Notification>();

  create(input: CreateNotificationInput): Promise<Notification> {
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
    this.notificationsById.set(notification.id, notification);
    return Promise.resolve(notification);
  }

  list(filter: NotificationListFilter): Promise<NotificationListResult> {
    const ofUser = this.ofUser(filter.userId);
    const matched = ofUser
      .filter((item) => (filter.unreadOnly ? item.readAt === null : true))
      // Mới nhất lên đầu.
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

    const start = (filter.page - 1) * filter.limit;
    return Promise.resolve({
      items: matched.slice(start, start + filter.limit),
      total: matched.length,
      unreadCount: ofUser.filter((item) => item.readAt === null).length,
    });
  }

  markRead(id: string, userId: string): Promise<Notification | null> {
    const existing = this.notificationsById.get(id);
    if (!existing || existing.userId !== userId) {
      return Promise.resolve(null);
    }
    const updated: Notification = { ...existing, readAt: new Date().toISOString() };
    this.notificationsById.set(id, updated);
    return Promise.resolve(updated);
  }

  markAllRead(userId: string): Promise<number> {
    const now = new Date().toISOString();
    let count = 0;
    for (const item of this.ofUser(userId)) {
      if (item.readAt === null) {
        this.notificationsById.set(item.id, { ...item, readAt: now });
        count += 1;
      }
    }
    return Promise.resolve(count);
  }

  countUnread(userId: string): Promise<number> {
    return Promise.resolve(this.ofUser(userId).filter((item) => item.readAt === null).length);
  }

  private ofUser(userId: string): Notification[] {
    return [...this.notificationsById.values()].filter((item) => item.userId === userId);
  }
}
