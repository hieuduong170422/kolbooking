import { Link, useSearchParams } from 'react-router';
import { useAuth } from '../features/auth/store/use-auth';
import { ChatThread } from '../features/messages/components/chat-thread';
import { useConversations } from '../features/messages/hooks/use-messages';
import { ErrorState } from '../shared/components/feedback/error-state';
import { LoadingState } from '../shared/components/feedback/loading-state';

const formatWhen = (iso: string | null): string =>
  iso === null ? '' : new Date(iso).toLocaleDateString('vi-VN');

/**
 * Trang /messages — danh sách hội thoại bên trái, khung chat bên phải.
 * Luồng đang mở nằm trên URL (?c=...) để chia sẻ và quay lại được (OD-09).
 */
export const MessagesPage = () => {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const { data, isPending, isError, refetch } = useConversations();

  if (!user) return null;
  if (isPending) return <LoadingState message="Đang tải tin nhắn..." />;
  if (isError || data === undefined) {
    return <ErrorState message="Không tải được danh sách trò chuyện." onRetry={() => void refetch()} />;
  }

  const activeId = searchParams.get('c') ?? data[0]?.id ?? null;
  const active = data.find((conversation) => conversation.id === activeId) ?? null;
  const isCreator = user.role === 'creator';

  return (
    <section className="page">
      <div className="page__header">
        <h1>Tin nhắn</h1>
        <p className="page__subtitle">
          {isCreator
            ? 'Brand hỏi trước khi đặt — trả lời nhanh giúp chốt booking dễ hơn.'
            : 'Hỏi creator trước khi đặt gói. Mọi trao đổi được lưu làm bằng chứng.'}
        </p>
      </div>

      {data.length === 0 ? (
        <div className="feedback">
          <p className="feedback__title">Chưa có cuộc trò chuyện nào</p>
          <p>
            {isCreator
              ? 'Khi brand nhắn tin, cuộc trò chuyện sẽ xuất hiện ở đây.'
              : 'Mở hồ sơ một creator và bấm “Nhắn tin” để bắt đầu.'}
          </p>
          {!isCreator ? (
            <Link to="/creators" className="button button--primary">
              Khám phá creator
            </Link>
          ) : null}
        </div>
      ) : (
        <div className="messages-layout">
          <aside className="conversation-list">
            {data.map((conversation) => {
              const name = isCreator
                ? conversation.brandDisplayName
                : conversation.creatorDisplayName;
              return (
                <button
                  key={conversation.id}
                  type="button"
                  className={`conversation-item${conversation.id === activeId ? ' conversation-item--active' : ''}`}
                  onClick={() => setSearchParams({ c: conversation.id }, { replace: true })}
                >
                  <span className="conversation-item__avatar" aria-hidden="true">
                    {name.charAt(0).toUpperCase()}
                  </span>
                  <span className="conversation-item__body">
                    <span className="conversation-item__top">
                      <span className="conversation-item__name">{name}</span>
                      <span className="conversation-item__when">
                        {formatWhen(conversation.lastMessageAt)}
                      </span>
                    </span>
                    <span className="conversation-item__preview">
                      {conversation.lastMessagePreview ?? 'Chưa có tin nhắn'}
                    </span>
                  </span>
                  {conversation.unreadCount > 0 ? (
                    <span className="conversation-item__badge">{conversation.unreadCount}</span>
                  ) : null}
                </button>
              );
            })}
          </aside>

          <div className="messages-layout__thread">
            {active !== null ? (
              <>
                <div className="thread-head">
                  <div>
                    <p className="thread-head__name">
                      {isCreator ? active.brandDisplayName : active.creatorDisplayName}
                    </p>
                    {!isCreator ? (
                      <Link to={`/creators/${active.creatorId}`} className="thread-head__link">
                        Xem hồ sơ và gói dịch vụ
                      </Link>
                    ) : null}
                  </div>
                  {!isCreator ? (
                    <Link
                      to={`/creators/${active.creatorId}/book`}
                      className="button button--primary"
                    >
                      Đặt booking
                    </Link>
                  ) : null}
                </div>
                <ChatThread conversationId={active.id} />
              </>
            ) : (
              <p className="chat__empty">Chọn một cuộc trò chuyện để xem nội dung.</p>
            )}
          </div>
        </div>
      )}
    </section>
  );
};
