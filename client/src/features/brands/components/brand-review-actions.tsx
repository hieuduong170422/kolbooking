import { useState } from 'react';
import type { BrandStatus } from '../types/brand-types';

type ReasonAction = 'request_info' | 'reject' | 'suspend';

export interface BrandReviewInput {
  readonly brandId: string;
  readonly action: 'approve' | ReasonAction;
  readonly reason?: string;
}

interface BrandReviewActionsProps {
  readonly brandId: string;
  readonly status: BrandStatus;
  readonly onAction: (input: BrandReviewInput) => void;
}

const REASON_ACTION_LABELS: Record<ReasonAction, string> = {
  request_info: 'Yêu cầu bổ sung',
  reject: 'Từ chối',
  suspend: 'Tạm khóa',
};

/** Nút duyệt brand — mirror ReviewActions của creator (BRD-007). */
export const BrandReviewActions = ({ brandId, status, onAction }: BrandReviewActionsProps) => {
  const [openAction, setOpenAction] = useState<ReasonAction | null>(null);
  const [reason, setReason] = useState('');

  const openModal = (action: ReasonAction): void => {
    setOpenAction(action);
    setReason('');
  };

  const confirm = (): void => {
    if (openAction === null) return;
    onAction({ brandId, action: openAction, reason: reason.trim() });
    setOpenAction(null);
  };

  return (
    <div className="review-actions">
      {status === 'pending_review' ? (
        <>
          <button
            type="button"
            className="button button--primary"
            onClick={() => onAction({ brandId, action: 'approve' })}
          >
            Duyệt
          </button>
          <button
            type="button"
            className="button button--secondary"
            onClick={() => openModal('request_info')}
          >
            Yêu cầu bổ sung
          </button>
          <button type="button" className="button button--danger" onClick={() => openModal('reject')}>
            Từ chối
          </button>
        </>
      ) : null}
      {status === 'verified' ? (
        <button type="button" className="button button--danger" onClick={() => openModal('suspend')}>
          Tạm khóa
        </button>
      ) : null}

      {openAction !== null ? (
        <div className="modal" role="dialog" aria-modal="true">
          <div className="modal__card">
            <h2>{REASON_ACTION_LABELS[openAction]}</h2>
            <label className="form-field">
              <span>Lý do (bắt buộc)</span>
              <textarea
                className="input"
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                rows={3}
                minLength={5}
              />
            </label>
            <div className="form-actions">
              <button
                type="button"
                className="button button--primary"
                disabled={reason.trim().length < 5}
                onClick={confirm}
              >
                Xác nhận
              </button>
              <button
                type="button"
                className="button button--ghost"
                onClick={() => setOpenAction(null)}
              >
                Hủy
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};
