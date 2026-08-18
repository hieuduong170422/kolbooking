import { useContext } from 'react';
import { useNavigate } from 'react-router';
import { AuthContext } from '../../auth/store/auth-context';
import { Button } from '../../../shared/components/ui';
import { useStartConversation } from '../hooks/use-messages';

/** Phần bấm được — chỉ mount khi chắc chắn là brand đã đăng nhập. */
const StartButton = ({ creatorId }: { creatorId: string }) => {
  const navigate = useNavigate();
  const start = useStartConversation();

  return (
    <Button
      className="booking-panel__cta chatbox"
      loading={start.isPending}
      onClick={() =>
        start.mutate(creatorId, {
          onSuccess: (conversation) => navigate(`/messages?c=${conversation.id}`),
        })
      }
    >
      {start.isPending ? 'Đang mở...' : 'Nhắn tin cho creator'}
    </Button>
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
