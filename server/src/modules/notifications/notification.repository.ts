import type {
  CreateNotificationInput,
  Notification,
  NotificationListFilter,
  NotificationListResult,
} from './notification.types.js';

export interface NotificationRepository {
  create(input: CreateNotificationInput): Promise<Notification>;
  list(filter: NotificationListFilter): Promise<NotificationListResult>;
  /** Đánh dấu một thông báo đã đọc; null nếu không tồn tại hoặc không thuộc user. */
  markRead(id: string, userId: string): Promise<Notification | null>;
  markAllRead(userId: string): Promise<number>;
  countUnread(userId: string): Promise<number>;
}
