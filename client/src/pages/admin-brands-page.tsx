import { useState } from 'react';
import { BrandReviewActions } from '../features/brands/components/brand-review-actions';
import { useBrandReviewQueue, useReviewBrand } from '../features/brands/hooks/use-brand-profile';
import {
  BRAND_ENTITY_TYPE_LABELS,
  BRAND_STATUS_LABELS,
  type BrandStatus,
} from '../features/brands/types/brand-types';
import { ErrorState } from '../shared/components/feedback/error-state';
import { LoadingState } from '../shared/components/feedback/loading-state';
import { Pagination } from '../shared/components/pagination/pagination';
import { Tabs } from '../shared/components/ui';
import { clientEnv } from '../shared/config/env';

const QUEUE_STATUSES: readonly BrandStatus[] = [
  'pending_review',
  'info_required',
  'rejected',
  'verified',
  'suspended',
];

/** Trang /admin/brands — hàng chờ duyệt hồ sơ brand (BRD-007, ADM-003). */
export const AdminBrandsPage = () => {
  const [status, setStatus] = useState<BrandStatus>('pending_review');
  const [page, setPage] = useState(1);
  const { data, isLoading, isError, refetch } = useBrandReviewQueue({ status, page, limit: 12 });
  const reviewBrand = useReviewBrand();

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

  const brands = data.data;
  const meta = data.meta;

  const handleStatusChange = (nextStatus: BrandStatus): void => {
    setStatus(nextStatus);
    setPage(1);
  };

  return (
    <section className="page">
      <div className="page__header">
        <h1>Duyệt hồ sơ brand</h1>
        <p className="page__subtitle">Hàng chờ duyệt hồ sơ brand theo trạng thái (BRD-007).</p>
      </div>

      <Tabs
        label="Lọc theo trạng thái"
        value={status}
        options={QUEUE_STATUSES.map((item) => ({
          key: item,
          value: item,
          label: BRAND_STATUS_LABELS[item],
        }))}
        onChange={handleStatusChange}
      />

      {brands.length === 0 ? (
        <p className="feedback">Không có hồ sơ nào ở trạng thái {BRAND_STATUS_LABELS[status]}.</p>
      ) : (
        <>
          <ul className="review-queue">
            {brands.map((brand) => (
              <li key={brand.id} className="review-row">
                <span className="review-row__avatar review-row__avatar--fallback" aria-hidden="true">
                  {brand.name.charAt(0)}
                </span>
                <div className="review-row__body">
                  <div className="review-row__heading">
                    <span className="review-row__name">{brand.name}</span>
                    <span className="badge">{BRAND_STATUS_LABELS[brand.status]}</span>
                  </div>
                  <p className="review-row__meta">
                    <span>{brand.industry}</span>
                    <span>{BRAND_ENTITY_TYPE_LABELS[brand.entityType]}</span>
                    <span>{brand.businessAddress}</span>
                  </p>
                  <p className="review-row__email">
                    {brand.userEmail} · Liên hệ: {brand.contact.name} ({brand.contact.phone})
                  </p>
                  {brand.verificationDocs.length > 0 ? (
                    <p className="review-row__meta">
                      Giấy tờ:{' '}
                      {brand.verificationDocs.map((doc, index) => (
                        <a
                          key={doc.id}
                          href={`${clientEnv.apiBaseUrl}/brands/${brand.id}/documents/${doc.id}`}
                          target="_blank"
                          rel="noreferrer"
                        >
                          {doc.fileName}
                          {index < brand.verificationDocs.length - 1 ? ', ' : ''}
                        </a>
                      ))}
                    </p>
                  ) : (
                    <p className="review-row__meta">Chưa có giấy tờ xác minh.</p>
                  )}
                </div>
                <BrandReviewActions
                  brandId={brand.id}
                  status={brand.status}
                  onAction={(input) => reviewBrand.mutate(input)}
                />
              </li>
            ))}
          </ul>
          {meta !== undefined && meta.totalPages > 1 ? (
            <Pagination meta={meta} onPageChange={setPage} />
          ) : null}
        </>
      )}
    </section>
  );
};
