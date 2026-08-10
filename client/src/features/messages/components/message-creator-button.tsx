import { useContext } from 'react';
import { useNavigate } from 'react-router';
import { AuthContext } from '../../auth/store/auth-context';
import { useStartConversation } from '../hooks/use-messages';

/** Phần bấm được — chỉ mount khi chắc chắn là brand đã đăng nhập. */
const StartButton = ({ creatorId }: { creatorId: string }) => {
  const navigate = useNavigate();
  const start = useStartConversation();

  return (
    <button
      type="button"
      className="button button--secondary booking-panel__cta chatbox"
      disabled={start.isPending}
      onClick={() =>
        start.mutate(creatorId, {
          onSuccess: (conversation) => navigate(`/messages?c=${conversation.id}`),
        })
      }
    >
      {start.isPending ? 'Đang mở...' : 'Nhắn tin cho creator'}
    </button>
  );
};

/**
 * Nút mở hội thoại từ hồ sơ creator (OD-09) — chỉ brand thấy.
 * Đọc context trực tiếp và tách phần điều khiển: hook mutation không được
 * chạy khi chưa có provider.
 */
export const MessageCreatorButton = ({ creatorId }: { creatorId: string }) => {
  const auth = useContext(AuthContext);
  if (auth?.user?.role !== 'brand') return null;
  return <StartButton creatorId={creatorId} />;
};
