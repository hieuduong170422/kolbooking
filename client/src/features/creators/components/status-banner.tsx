import type { CreatorStatus } from '../types/creator-types';

// Tin nhắn chính theo trạng thái — khớp từ khóa CREATOR_STATUS_LABELS (CRE-007).
// Ba trạng thái có lý do (info_required/rejected/suspended) sẽ ghép thêm statusReason.
const STATUS_BANNER_TEXT: Record<CreatorStatus, string> = {
  draft: 'Bản nháp — hoàn thiện và gửi duyệt',
  pending_review: 'Đang chờ duyệt',
  info_required: 'Cần bổ sung',
  rejected: 'Bị từ chối',
  verified: 'Đã duyệt',
  suspended: 'Tạm khóa',
};

const STATUS_WITH_REASON: readonly CreatorStatus[] = ['info_required', 'rejected', 'suspended'];

const STATUS_VARIANT: Record<CreatorStatus, string> = {
  draft: 'status-banner--neutral',
  pending_review: 'status-banner--info',
  info_required: 'status-banner--warning',
  rejected: 'status-banner--danger',
  verified: 'status-banner--success',
  suspended: 'status-banner--danger',
};

/** Banner trạng thái hồ sơ — dùng lại ở dashboard/onboarding (CRE-007). Không dùng hook. */
export const StatusBanner = ({
  status,
  statusReason,
}: {
  status: CreatorStatus;
  statusReason: string | null;
}) => {
  const hasReason = STATUS_WITH_REASON.includes(status) && statusReason !== null;

  return (
    <p className={`status-banner ${STATUS_VARIANT[status]}`} role="status">
      {STATUS_BANNER_TEXT[status]}
      {hasReason ? `: ${statusReason}` : ''}
    </p>
  );
};
