import { useContext, useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router';
import { apiGet, apiPost } from '../../shared/api/http-client';
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
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const markRead = useMutation({
    mutationFn: (id: string) => apiPost(`/notifications/${id}/read`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });
  const markAllRead = useMutation({
    mutationFn: () => apiPost('/notifications/read-all'),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });

  // Đóng menu khi bấm ra ngoài hoặc nhấn Escape (a11y) — mirror menu user.
  useEffect(() => {
    if (!open) return;
    const handleMouseDown = (event: MouseEvent): void => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  const items = data?.items ?? [];
  const unreadCount = data?.unreadCount ?? 0;

  const openItem = (notification: Notification): void => {
    if (notification.readAt === null) markRead.mutate(notification.id);
    setOpen(false);
    navigate(notification.link);
  };

  return (
    <div className="notif" ref={containerRef}>
      <button
        type="button"
        className="notif__bell"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={unreadCount > 0 ? `Thông báo (${unreadCount} chưa đọc)` : 'Thông báo'}
        onClick={() => setOpen((value) => !value)}
      >
        <span aria-hidden="true">🔔</span>
        {unreadCount > 0 ? <span className="notif__badge">{unreadCount}</span> : null}
      </button>

      {open ? (
        <div className="notif__panel" role="menu">
          <div className="notif__head">
            <span>Thông báo</span>
            {unreadCount > 0 ? (
              <button
                type="button"
                className="button-link"
                onClick={() => markAllRead.mutate()}
                disabled={markAllRead.isPending}
              >
                Đánh dấu đã đọc hết
              </button>
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
                    onClick={() => openItem(notification)}
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
        </div>
      ) : null}
    </div>
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
