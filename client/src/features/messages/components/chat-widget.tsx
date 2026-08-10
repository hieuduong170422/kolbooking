import { useContext, useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { Link, useLocation } from 'react-router';
import { AuthContext } from '../../auth/store/auth-context';
import type { AuthRole } from '../../auth/types/auth-types';
import { useConversations } from '../hooks/use-messages';
import {
  conversationPeerName,
  conversationPreview,
  formatUnreadBadge,
  totalUnread,
} from '../utils/conversation-peer';
import { ChatThread } from './chat-thread';

/** Nội dung widget — chỉ mount khi đã đăng nhập (hook cần provider). */
const WidgetBody = ({ role }: { role: AuthRole }) => {
  const { data, isPending, isError, refetch } = useConversations();
  const [open, setOpen] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const bubbleRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const wasOpen = useRef(false);

  // Mở thì đưa tiêu điểm vào panel, đóng thì trả về bong bóng — nếu không,
  // người dùng bàn phím bị văng về đầu trang ngay giữa thao tác.
  useEffect(() => {
    if (open) panelRef.current?.focus();
    else if (wasOpen.current) bubbleRef.current?.focus();
    wasOpen.current = open;
  }, [open]);

  const conversations = data ?? [];
  const unreadTotal = totalUnread(conversations);
  const active = conversations.find((conversation) => conversation.id === activeId) ?? null;
  const isCreator = role === 'creator';

  if (!open) {
    return (
      <button
        type="button"
        ref={bubbleRef}
        className="chat-widget__bubble"
        onClick={() => setOpen(true)}
        aria-label={unreadTotal > 0 ? `Mở tin nhắn (${unreadTotal} chưa đọc)` : 'Mở tin nhắn'}
      >
        <span aria-hidden="true">💬</span>
        {unreadTotal > 0 ? (
          <span className="chat-widget__badge" aria-hidden="true">
            {formatUnreadBadge(unreadTotal)}
          </span>
        ) : null}
      </button>
    );
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>): void => {
    if (event.key === 'Escape') setOpen(false);
  };

  return (
    <div
      className="chat-widget__panel"
      role="dialog"
      aria-label="Hộp tin nhắn"
      ref={panelRef}
      tabIndex={-1}
      onKeyDown={handleKeyDown}
    >
      <div className="chat-widget__head">
        {active !== null ? (
          <button
            type="button"
            className="chat-widget__back"
            onClick={() => setActiveId(null)}
            aria-label="Quay lại danh sách"
          >
            ←
          </button>
        ) : null}
        <span className="chat-widget__title">
          {active !== null ? conversationPeerName(active, role) : 'Tin nhắn'}
        </span>
        <button
          type="button"
          className="chat-widget__collapse"
          onClick={() => setOpen(false)}
          aria-label="Thu nhỏ hộp tin nhắn"
        >
          ×
        </button>
      </div>

      <div className="chat-widget__body">
        {active !== null ? <ChatThread conversationId={active.id} /> : null}

        {active === null && isPending ? (
          <p className="chat-widget__empty">Đang tải cuộc trò chuyện...</p>
        ) : null}

        {/* Lỗi mạng phải nói là lỗi — báo "chưa có hội thoại" là nói sai sự thật. */}
        {active === null && isError ? (
          <div className="chat-widget__empty">
            <p>Không tải được danh sách trò chuyện.</p>
            <button type="button" className="button button--secondary" onClick={() => void refetch()}>
              Thử lại
            </button>
          </div>
        ) : null}

        {active === null && !isPending && !isError && conversations.length === 0 ? (
          <p className="chat-widget__empty">
            {isCreator
              ? 'Khi brand nhắn tin, cuộc trò chuyện sẽ xuất hiện ở đây.'
              : 'Chưa có cuộc trò chuyện nào. Mở hồ sơ creator và bấm “Nhắn tin” để bắt đầu.'}
          </p>
        ) : null}

        {active === null && conversations.length > 0 ? (
          <ul className="chat-widget__list">
            {conversations.map((conversation) => (
              <li key={conversation.id}>
                <button
                  type="button"
                  className="chat-widget__item"
                  onClick={() => setActiveId(conversation.id)}
                >
                  <span className="chat-widget__item-name">
                    {conversationPeerName(conversation, role)}
                  </span>
                  <span className="chat-widget__item-preview">
                    {conversationPreview(conversation)}
                  </span>
                  {conversation.unreadCount > 0 ? (
                    <span className="chat-widget__item-badge">{conversation.unreadCount}</span>
                  ) : null}
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      <div className="chat-widget__foot">
        <Link to="/messages" onClick={() => setOpen(false)}>
          Mở trang tin nhắn đầy đủ
        </Link>
      </div>
    </div>
  );
};

/**
 * Bong bóng chat nổi góc dưới phải, thu/phóng được.
 * Ẩn trên chính trang /messages vì đã có khung chat đầy đủ ở đó.
 */
export const ChatWidget = () => {
  const auth = useContext(AuthContext);
  const location = useLocation();

  const role = auth?.user?.role;
  if (role === undefined || role === 'admin') return null;
  if (location.pathname === '/messages') return null;

  return (
    <div className="chat-widget">
      <WidgetBody role={role} />
    </div>
  );
};
