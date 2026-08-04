import { useState } from 'react';
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
          <button
            type="button"
            className="button button--primary"
            onClick={() => onAction({ creatorId, action: 'approve' })}
          >
            Duyệt
          </button>
          <button
            type="button"
            className="button button--warning"
            onClick={() => openModal('request_info')}
          >
            Yêu cầu bổ sung
          </button>
          <button
            type="button"
            className="button button--danger"
            onClick={() => openModal('reject')}
          >
            Từ chối
          </button>
        </>
      ) : null}
      {isVerified ? (
        <button type="button" className="button button--danger" onClick={() => openModal('suspend')}>
          Tạm khóa
        </button>
      ) : null}

      {openAction !== null ? (
        <div className="modal" role="dialog" aria-modal="true">
          <div className="modal__card">
            <div className="modal__header">
              <h2>{REASON_ACTION_LABELS[openAction]}</h2>
              <button
                type="button"
                className="modal__close"
                aria-label="Đóng"
                onClick={closeModal}
              >
                ×
              </button>
            </div>
            <div className="form-field">
              <label htmlFor={`review-reason-${creatorId}`}>Lý do</label>
              <textarea
                id={`review-reason-${creatorId}`}
                className="textarea"
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                placeholder="Nhập lý do cho creator..."
              />
            </div>
            <div className="modal__actions">
              <button type="button" className="button button--secondary" onClick={closeModal}>
                Hủy
              </button>
              <button
                type="button"
                className="button button--primary"
                disabled={reason.trim() === ''}
                onClick={confirm}
              >
                Xác nhận
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};
