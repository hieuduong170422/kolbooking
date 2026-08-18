import { useContext } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router';
import { apiGet, apiPost } from '../../shared/api/http-client';
import { Button, Popover } from '../../shared/components/ui';
import { AuthContext } from '../auth/store/auth-context';

/** Mirror Notification phía server (NTF-001). */
export interface Notification {
  readonly id: string;
  readonly type: 'booking_status' | 'new_message' | 'deadline_reminder' | 'profile_review';
  readonly title: string;
  readonly body: string;
  readonly link: string;
  readonly readAt: string | null;
  readonly createdAt: string;
}

interface NotificationPayload {
  readonly items: readonly Notification[];
  readonly unreadCount: number;
}

const POLL_INTERVAL_MS = 30_000;

const fetchNotifications = async (): Promise<NotificationPayload> => {
  const response = await apiGet<NotificationPayload>('/notifications', { page: 1, limit: 20 });
  return response.data;
};

export const useNotifications = () =>
  useQuery({
    queryKey: ['notifications'] as const,
    queryFn: fetchNotifications,
    refetchInterval: POLL_INTERVAL_MS,
    retry: false,
  });

/** Chuông thông báo trên header — chỉ hiện khi đã đăng nhập. */
const NotificationMenu = () => {
  const { data } = useNotifications();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const markRead = useMutation({
    mutationFn: (id: string) => apiPost(`/notifications/${id}/read`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });
  const markAllRead = useMutation({
    mutationFn: () => apiPost('/notifications/read-all'),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const items = data?.items ?? [];
  const unreadCount = data?.unreadCount ?? 0;

  const openItem = (notification: Notification, close: () => void): void => {
    if (notification.readAt === null) markRead.mutate(notification.id);
    close();
    navigate(notification.link);
  };

  return (
    <Popover
      className="notif"
      triggerClassName="notif__bell"
      triggerLabel={unreadCount > 0 ? `Thông báo (${unreadCount} chưa đọc)` : 'Thông báo'}
      panelClassName="notif__panel"
      trigger={
        <>
          <span aria-hidden="true">🔔</span>
          {unreadCount > 0 ? <span className="notif__badge">{unreadCount}</span> : null}
        </>
      }
    >
      {(close) => (
        <>
          <div className="notif__head">
            <span>Thông báo</span>
            {unreadCount > 0 ? (
              <Button
                variant="link"
                onClick={() => markAllRead.mutate()}
                disabled={markAllRead.isPending}
              >
                Đánh dấu đã đọc hết
              </Button>
            ) : null}
          </div>

          {items.length === 0 ? (
            <p className="notif__empty">Chưa có thông báo nào.</p>
          ) : (
            <ul className="notif__list">
              {items.map((notification) => (
                <li key={notification.id}>
                  <button
                    type="button"
                    role="menuitem"
                    className={`notif__item${notification.readAt === null ? ' notif__item--unread' : ''}`}
                    onClick={() => openItem(notification, close)}
                  >
                    <span className="notif__title">{notification.title}</span>
                    <span className="notif__body">{notification.body}</span>
                    <span className="notif__time">
                      {new Date(notification.createdAt).toLocaleString('vi-VN')}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </Popover>
  );
};

/**
 * Bọc ngoài đọc context trực tiếp: chuông là chrome tuỳ chọn, nơi chưa có
 * AuthProvider/QueryClient thì không render thay vì làm vỡ cây.
 */
export const NotificationBell = () => {
  const auth = useContext(AuthContext);
  if (!auth?.user) return null;
  return <NotificationMenu />;
};
