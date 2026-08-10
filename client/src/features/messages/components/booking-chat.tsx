import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useAuth } from '../../auth/store/use-auth';
import { ApiClientError } from '../../../shared/api/api-types';
import { useMessageActions, useMessages } from '../hooks/use-messages';

const formatTime = (iso: string): string =>
  new Date(iso).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' });

/**
 * Khung chat trong booking (CHAT-001..CHAT-004).
 * Poll định kỳ thay vì realtime — đủ cho MVP và không cần hạ tầng thêm.
 */
export const BookingChat = ({ bookingId }: { bookingId: string }) => {
  const { user } = useAuth();
  const { data, isPending, isError } = useMessages(bookingId);
  const { send, markRead } = useMessageActions(bookingId);
  const [draft, setDraft] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  const messages = data?.data ?? [];

  // Đánh dấu đã đọc khi mở thread và mỗi khi có tin mới.
  useEffect(() => {
    if (messages.length > 0) markRead.mutate();
    // markRead là mutation ổn định; chỉ chạy lại khi số tin đổi.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages.length]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: 'nearest' });
  }, [messages.length]);

  if (!user) return null;

  const handleSubmit = (event: FormEvent): void => {
    event.preventDefault();
    const body = draft.trim();
    if (body.length === 0) return;
    send.mutate(body, { onSuccess: () => setDraft('') });
  };

  return (
    <section className="chat">
      <div className="chat__head">
        <h2>Trao đổi</h2>
        <p className="onb-hint">
          Giữ trao đổi trong nền tảng để có bằng chứng khi cần phân xử.
        </p>
      </div>

      <div className="chat__thread">
        {isPending ? <p className="onb-hint">Đang tải tin nhắn...</p> : null}
        {isError ? <p className="onb-hint">Không tải được tin nhắn.</p> : null}
        {!isPending && messages.length === 0 ? (
          <p className="chat__empty">Chưa có tin nhắn nào. Gửi lời chào để bắt đầu.</p>
        ) : null}

        {messages.map((message) => {
          const isMine = message.senderUserId === user.id;
          return (
            <div
              key={message.id}
              className={`chat__message${isMine ? ' chat__message--mine' : ''}${message.isDeleted ? ' chat__message--deleted' : ''}`}
            >
              <div className="chat__bubble">
                <p>{message.body}</p>
                {message.offPlatformFlagged && !message.isDeleted ? (
                  <p className="chat__warning">
                    Có vẻ bạn đang trao đổi liên hệ riêng. Giao dịch ngoài nền tảng sẽ mất bảo
                    đảm thanh toán.
                  </p>
                ) : null}
              </div>
              <span className="chat__meta">
                {message.senderRole === 'admin' ? 'Quản trị viên · ' : ''}
                {formatTime(message.createdAt)}
              </span>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {send.error instanceof ApiClientError ? (
        <p className="chat__error" role="alert">
          {send.error.message}
        </p>
      ) : null}

      <form className="chat__composer" onSubmit={handleSubmit}>
        <label className="visually-hidden" htmlFor="chat-input">
          Nội dung tin nhắn
        </label>
        <input
          id="chat-input"
          type="text"
          className="input"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="Nhập tin nhắn..."
          maxLength={2000}
        />
        <button
          type="submit"
          className="button button--primary"
          disabled={draft.trim().length === 0 || send.isPending}
        >
          {send.isPending ? 'Đang gửi...' : 'Gửi'}
        </button>
      </form>
    </section>
  );
};
