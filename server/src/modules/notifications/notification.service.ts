import { logger } from '../../shared/logger/logger.js';
import type { Mailer } from '../../shared/email/mailer.js';
import type { UserRepository } from '../users/user.repository.js';
import type { NotificationRepository } from './notification.repository.js';
import type {
  CreateNotificationInput,
  NotificationListResult,
  NotificationType,
} from './notification.types.js';

/**
 * Sự kiện bắt buộc gửi kèm email (NTF-002). Tin nhắn mới chỉ in-app để
 * không dội hộp thư — người dùng vào booking là thấy.
 */
const EMAIL_WORTHY: readonly NotificationType[] = [
  'booking_status',
  'deadline_reminder',
  'profile_review',
];

export class NotificationService {
  private readonly notifications: NotificationRepository;
  private readonly users: UserRepository;
  private readonly mailer: Mailer;

  constructor(
    notifications: NotificationRepository,
    users: UserRepository,
    mailer: Mailer,
  ) {
    this.notifications = notifications;
    this.users = users;
    this.mailer = mailer;
  }

  /**
   * Tạo thông báo in-app, kèm email cho sự kiện quan trọng.
   * Lỗi gửi mail KHÔNG được làm hỏng nghiệp vụ gốc — chỉ ghi log
   * (in-app vẫn là kênh chính, NTF-002 fallback).
   */
  async notify(input: CreateNotificationInput): Promise<void> {
    await this.notifications.create(input);

    if (!EMAIL_WORTHY.includes(input.type)) return;

    try {
      const user = await this.users.findById(input.userId);
      if (!user) return;
      await this.mailer.send({
        to: user.email,
        subject: input.title,
        // Không đưa dữ liệu nhạy cảm vào email (NTF-002) — chỉ tóm tắt + link.
        text: `${input.body}\n\nXem chi tiết: ${input.link}`,
      });
    } catch (error) {
      logger.warn({ err: error, userId: input.userId }, 'Gửi email thông báo thất bại');
    }
  }

  /** Gửi cùng một thông báo cho nhiều người (vd cả hai bên của booking). */
  async notifyMany(userIds: readonly string[], input: Omit<CreateNotificationInput, 'userId'>): Promise<void> {
    for (const userId of userIds) {
      await this.notify({ ...input, userId });
    }
  }

  list(
    userId: string,
    unreadOnly: boolean,
    page: number,
    limit: number,
  ): Promise<NotificationListResult> {
    return this.notifications.list({ userId, unreadOnly, page, limit });
  }

  markRead(id: string, userId: string): Promise<unknown> {
    return this.notifications.markRead(id, userId);
  }

  markAllRead(userId: string): Promise<number> {
    return this.notifications.markAllRead(userId);
  }
}
