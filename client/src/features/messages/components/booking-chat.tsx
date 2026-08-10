import { Link } from 'react-router';
import { useConversationForBooking } from '../hooks/use-messages';
import { ChatThread } from './chat-thread';

/**
 * Chat trong màn booking — dùng chung luồng với chat trước booking, nên
 * lịch sử hỏi đáp trước đó hiện luôn tại đây (OD-09).
 */
export const BookingChat = ({ bookingId }: { bookingId: string }) => {
  const { data: conversation, isPending, isError } = useConversationForBooking(bookingId);

  return (
    <section className="chat-section">
      <div className="chat__head">
        <h2>Trao đổi</h2>
        <p className="onb-hint">
          Cùng luồng với tin nhắn trước khi đặt. Giữ trao đổi trong nền tảng để có bằng chứng
          khi cần phân xử.
        </p>
      </div>

      {isPending ? <p className="onb-hint">Đang mở cuộc trò chuyện...</p> : null}
      {isError ? (
        <p className="onb-hint">
          Không mở được cuộc trò chuyện. Thử lại ở <Link to="/messages">trang tin nhắn</Link>.
        </p>
      ) : null}
      {conversation !== undefined ? (
        <ChatThread conversationId={conversation.id} bookingId={bookingId} />
      ) : null}
    </section>
  );
};
