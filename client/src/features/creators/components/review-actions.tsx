import { useState } from 'react';
import { Button, Modal, Textarea } from '../../../shared/components/ui';
import type { ReviewCreatorInput } from '../hooks/use-review-queue';
import type { CreatorStatus } from '../types/creator-types';

// Action cần nhập lý do — mở modal (approve không cần reason, gửi trực tiếp — CRE-008).
type ReasonAction = 'request_info' | 'reject' | 'suspend';

interface ReviewActionsProps {
  readonly creatorId: string;
  readonly status: CreatorStatus;
  readonly onAction: (input: ReviewCreatorInput) => void;
}

// Nhãn tiêu đề modal theo action (CRE-008).
const REASON_ACTION_LABELS: Record<ReasonAction, string> = {
  request_info: 'Yêu cầu bổ sung',
  reject: 'Từ chối',
  suspend: 'Tạm khóa',
};

/**
 * Nút hành động duyệt hồ sơ theo trạng thái:
 * - pending_review → Duyệt / Yêu cầu bổ sung / Từ chối
 * - verified → Tạm khóa
 * Các action cần lý do mở modal; approve gọi onAction ngay (CRE-008).
 */
export const ReviewActions = ({ creatorId, status, onAction }: ReviewActionsProps) => {
  const [openAction, setOpenAction] = useState<ReasonAction | null>(null);
  const [reason, setReason] = useState('');

  const isPending = status === 'pending_review';
  const isVerified = status === 'verified';

  // Mở modal cho action cần reason — reset reason mỗi lần mở.
  const openModal = (action: ReasonAction): void => {
    setOpenAction(action);
    setReason('');
  };

  const closeModal = (): void => setOpenAction(null);

  const confirm = (): void => {
    if (openAction === null) return;
    onAction({ creatorId, action: openAction, reason: reason.trim() });
    closeModal();
  };

  return (
    <div className="review-actions">
      {isPending ? (
        <>
          <Button variant="primary" onClick={() => onAction({ creatorId, action: 'approve' })}>
            Duyệt
          </Button>
          <Button variant="warning" onClick={() => openModal('request_info')}>
            Yêu cầu bổ sung
          </Button>
          <Button variant="danger" onClick={() => openModal('reject')}>
            Từ chối
          </Button>
        </>
      ) : null}
      {isVerified ? (
        <Button variant="danger" onClick={() => openModal('suspend')}>
          Tạm khóa
        </Button>
      ) : null}

      {openAction !== null ? (
        <Modal
          title={REASON_ACTION_LABELS[openAction]}
          onClose={closeModal}
          footer={
            <>
              <Button onClick={closeModal}>Hủy</Button>
              <Button variant="primary" disabled={reason.trim() === ''} onClick={confirm}>
                Xác nhận
              </Button>
            </>
          }
        >
          <Textarea
            label="Lý do"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder="Nhập lý do cho creator..."
          />
        </Modal>
      ) : null}
    </div>
  );
};
