import { useState } from 'react';
import { CreatorDetailModal } from '../features/creators/components/creator-detail-modal';
import { ReviewActions } from '../features/creators/components/review-actions';
import { useReviewCreator, useReviewQueue } from '../features/creators/hooks/use-review-queue';
import type { CreatorAdmin, CreatorStatus } from '../features/creators/types/creator-types';
import { CREATOR_STATUS_LABELS, CREATOR_TYPE_LABELS } from '../features/creators/types/creator-types';
import { ErrorState } from '../shared/components/feedback/error-state';
import { LoadingState } from '../shared/components/feedback/loading-state';
import { Pagination } from '../shared/components/pagination/pagination';

// Tab trạng thái của hàng chờ duyệt (CRE-008).
const QUEUE_STATUSES: readonly CreatorStatus[] = [
  'pending_review',
  'info_required',
  'rejected',
  'verified',
  'suspended',
];

/** Trang /admin/creators — hàng chờ duyệt hồ sơ creator theo trạng thái (CRE-008, ADM-003). */
export const AdminCreatorsPage = () => {
  const [status, setStatus] = useState<CreatorStatus>('pending_review');
  const [page, setPage] = useState(1);
  // Creator đang xem chi tiết — mở modal render toàn bộ dữ liệu queue (CRE-008).
  const [selectedCreator, setSelectedCreator] = useState<CreatorAdmin | null>(null);
  const { data, isLoading, isError, refetch } = useReviewQueue({ status, page, limit: 12 });
  const reviewCreator = useReviewCreator();

  if (isLoading) {
    return (
      <section className="page">
        <LoadingState message="Đang tải danh sách chờ duyệt..." />
      </section>
    );
  }

  if (isError || data === undefined) {
    return (
      <section className="page">
        <ErrorState message="Không tải được danh sách chờ duyệt." onRetry={refetch} />
      </section>
    );
  }

  const creators = data.data;
  const meta = data.meta;

  // Đổi tab → reset về trang 1 để không đứng lệch trang.
  const handleStatusChange = (nextStatus: CreatorStatus): void => {
    setStatus(nextStatus);
    setPage(1);
  };

  return (
    <section className="page">
      <div className="page__header">
        <h1>Duyệt hồ sơ creator</h1>
        <p className="page__subtitle">Hàng chờ duyệt hồ sơ creator theo trạng thái (CRE-008).</p>
      </div>

      <div className="review-tabs" role="tablist" aria-label="Lọc theo trạng thái">
        {QUEUE_STATUSES.map((item) => (
          <button
            key={item}
            type="button"
            className={`review-tabs__tab${item === status ? ' review-tabs__tab--active' : ''}`}
            onClick={() => handleStatusChange(item)}
          >
            {CREATOR_STATUS_LABELS[item]}
          </button>
        ))}
      </div>

      {creators.length === 0 ? (
        <p className="feedback">Không có hồ sơ nào ở trạng thái {CREATOR_STATUS_LABELS[status]}.</p>
      ) : (
        <>
          <ul className="review-queue">
            {creators.map((creator) => (
              <li key={creator.id} className="review-row">
                {creator.avatarUrl !== null ? (
                  <img className="review-row__avatar" src={creator.avatarUrl} alt="" />
                ) : (
                  <span className="review-row__avatar review-row__avatar--fallback" aria-hidden="true">
                    {creator.displayName.charAt(0)}
                  </span>
                )}
                <div className="review-row__body">
                  <div className="review-row__heading">
                    <span className="review-row__name">{creator.displayName}</span>
                    <span className="badge">{CREATOR_STATUS_LABELS[creator.status]}</span>
                  </div>
                  <p className="review-row__meta">
                    <span>{creator.city}</span>
                    <span>{CREATOR_TYPE_LABELS[creator.creatorType]}</span>
                    {creator.socialAccounts[0] ? (
                      <span>
                        {creator.socialAccounts[0].platform} / {creator.socialAccounts[0].handle}
                      </span>
                    ) : null}
                  </p>
                  <p className="review-row__email">{creator.userEmail}</p>
                </div>
                <button
                  type="button"
                  className="button button--secondary"
                  onClick={() => setSelectedCreator(creator)}
                >
                  Xem chi tiết
                </button>
                <ReviewActions
                  creatorId={creator.id}
                  status={creator.status}
                  onAction={(input) => reviewCreator.mutate(input)}
                />
              </li>
            ))}
          </ul>
          {meta !== undefined && meta.totalPages > 1 ? (
            <Pagination meta={meta} onPageChange={setPage} />
          ) : null}
        </>
      )}

      {selectedCreator !== null ? (
        <CreatorDetailModal creator={selectedCreator} onClose={() => setSelectedCreator(null)} />
      ) : null}
    </section>
  );
};
