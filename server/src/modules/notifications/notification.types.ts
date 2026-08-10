export const NOTIFICATION_TYPES = [
  'booking_status',
  'new_message',
  'deadline_reminder',
  'profile_review',
] as const;
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

/** Thông báo in-app (NTF-001) — có read/unread và deep link về đúng màn. */
export interface Notification {
  readonly id: string;
  readonly userId: string;
  readonly type: NotificationType;
  readonly title: string;
  readonly body: string;
  /** Đường dẫn client, vd /bookings/bkg_xxx. */
  readonly link: string;
  readonly readAt: string | null;
  readonly createdAt: string;
}

export type CreateNotificationInput = Omit<Notification, 'id' | 'readAt' | 'createdAt'>;

export interface NotificationListFilter {
  readonly userId: string;
  readonly unreadOnly: boolean;
  readonly page: number;
  readonly limit: number;
}

export interface NotificationListResult {
  readonly items: readonly Notification[];
  readonly total: number;
  readonly unreadCount: number;
}
