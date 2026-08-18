import { useState } from 'react';
import { Button, Modal, Textarea } from '../../../shared/components/ui';
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
          <Button variant="primary" onClick={() => onAction({ brandId, action: 'approve' })}>
            Duyệt
          </Button>
          <Button onClick={() => openModal('request_info')}>Yêu cầu bổ sung</Button>
          <Button variant="danger" onClick={() => openModal('reject')}>
            Từ chối
          </Button>
        </>
      ) : null}
      {status === 'verified' ? (
        <Button variant="danger" onClick={() => openModal('suspend')}>
          Tạm khóa
        </Button>
      ) : null}

      {openAction !== null ? (
        <Modal
          title={REASON_ACTION_LABELS[openAction]}
          onClose={() => setOpenAction(null)}
          footer={
            <>
              <Button variant="ghost" onClick={() => setOpenAction(null)}>
                Hủy
              </Button>
              <Button variant="primary" disabled={reason.trim().length < 5} onClick={confirm}>
                Xác nhận
              </Button>
            </>
          }
        >
          <Textarea
            label="Lý do (bắt buộc)"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            rows={3}
            minLength={5}
          />
        </Modal>
      ) : null}
    </div>
  );
};
