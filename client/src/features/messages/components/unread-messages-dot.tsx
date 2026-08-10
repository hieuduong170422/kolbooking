import { useContext } from 'react';
import { AuthContext } from '../../auth/store/auth-context';
import { useConversations } from '../hooks/use-messages';
import { formatUnreadBadge, totalUnread } from '../utils/conversation-peer';

const Dot = () => {
  const { data } = useConversations();
  const count = totalUnread(data ?? []);
  if (count === 0) return null;

  return (
    // role="status" để trình đọc màn hình đọc lên khi số thay đổi lúc poll.
    // aria-label trên <span> trơn không được ARIA cho phép nên dùng chữ ẩn.
    <span className="nav-dot" role="status">
      <span className="visually-hidden">{count} tin nhắn chưa đọc</span>
      <span aria-hidden="true">{formatUnreadBadge(count)}</span>
    </span>
  );
};

/**
 * Chấm đỏ số tin chưa đọc cạnh mục "Tin nhắn".
 * Đọc context trực tiếp và tách phần gọi hook: chưa đăng nhập thì không
 * render, tránh useQuery chạy khi thiếu provider.
 */
export const UnreadMessagesDot = () => {
  const auth = useContext(AuthContext);
  if (!auth?.user || auth.user.role === 'admin') return null;
  return <Dot />;
};
