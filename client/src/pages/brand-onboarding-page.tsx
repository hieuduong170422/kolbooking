import { useRef, useState } from 'react';
import { BrandProfileForm } from '../features/brands/components/brand-profile-form';
import { useBrandActions, useBrandProfile } from '../features/brands/hooks/use-brand-profile';
import type { BrandProfileInput } from '../features/brands/types/brand-types';
import { StatusBanner } from '../features/creators/components/status-banner';
import { ApiClientError } from '../shared/api/api-types';
import { ErrorState } from '../shared/components/feedback/error-state';
import { LoadingState } from '../shared/components/feedback/loading-state';

/**
 * Trang /brand-onboarding — hồ sơ brand: form + giấy tờ xác minh + gửi duyệt
 * (BRD-001..BRD-004). Trạng thái hiển thị qua StatusBanner (tái dùng creator).
 */
export const BrandOnboardingPage = () => {
  const { data: brand, isLoading, isError, error, refetch } = useBrandProfile();
  const actions = useBrandActions();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [actionError, setActionError] = useState<unknown>(null);

  if (isLoading) {
    return (
      <section className="page">
        <LoadingState message="Đang tải hồ sơ brand..." />
      </section>
    );
  }

  const isNotFound = error instanceof ApiClientError && error.code === 'PROFILE_NOT_FOUND';
  if (isError && !isNotFound) {
    return (
      <section className="page">
        <ErrorState message="Không tải được hồ sơ brand." onRetry={refetch} />
      </section>
    );
  }

  const handleSave = async (input: BrandProfileInput): Promise<void> => {
    await actions.update.mutateAsync(input);
  };

  const handleUpload = (file: File | undefined): void => {
    if (!file) return;
    setActionError(null);
    actions.uploadDoc.mutateAsync(file).catch((err: unknown) => setActionError(err));
    // Reset input để chọn lại cùng file vẫn trigger change.
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmitReview = (): void => {
    setActionError(null);
    actions.submit.mutateAsync().catch((err: unknown) => setActionError(err));
  };

  const canEdit =
    brand === undefined || !['pending_review', 'suspended'].includes(brand.status);
  const canSubmit =
    brand !== undefined && ['draft', 'rejected', 'info_required'].includes(brand.status);

  return (
    <section className="page page--narrow">
      <div className="page__header">
        <h1>{brand ? 'Hồ sơ brand' : 'Tạo hồ sơ brand'}</h1>
        <p className="page__subtitle">
          Hồ sơ đầy đủ và được xác minh là điều kiện để tạo booking (BRD-001).
        </p>
      </div>

      {brand ? <StatusBanner status={brand.status} statusReason={brand.statusReason} /> : null}

      {actionError instanceof ApiClientError ? (
        <div className="notice notice--warning" role="alert">
          <p>{actionError.message}</p>
        </div>
      ) : null}

      {canEdit ? (
        <div className="dashboard-card">
          <BrandProfileForm {...(brand !== undefined ? { initial: brand } : {})} onSubmit={handleSave} />
        </div>
      ) : (
        <p className="feedback">Hồ sơ đang được xử lý — không thể chỉnh sửa lúc này.</p>
      )}

      {brand ? (
        <div className="dashboard-card">
          <h2>Giấy tờ xác minh</h2>
          <p className="page__subtitle">
            Ảnh giấy phép kinh doanh / CCCD theo loại chủ thể — file riêng tư, chỉ đội duyệt xem
            được (BRD-003).
          </p>
          {brand.verificationDocs.length > 0 ? (
            <ul className="doc-list">
              {brand.verificationDocs.map((doc) => (
                <li key={doc.id} className="doc-list__item">
                  <span>{doc.fileName}</span>
                  <span className="doc-list__date">
                    {new Date(doc.uploadedAt).toLocaleDateString('vi-VN')}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="feedback">Chưa có giấy tờ nào — cần ít nhất một file để gửi duyệt.</p>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="visually-hidden"
            aria-label="Chọn file giấy tờ"
            onChange={(event) => handleUpload(event.target.files?.[0])}
          />
          <button
            type="button"
            className="button button--secondary"
            disabled={actions.uploadDoc.isPending}
            onClick={() => fileInputRef.current?.click()}
          >
            {actions.uploadDoc.isPending ? 'Đang tải lên...' : '+ Tải giấy tờ'}
          </button>
        </div>
      ) : null}

      {canSubmit ? (
        <div className="dashboard-card">
          <h2>Gửi duyệt</h2>
          <p className="page__subtitle">
            Đội vận hành sẽ duyệt trong 24-48h. Hồ sơ Verified mới tạo được booking.
          </p>
          <button
            type="button"
            className="button button--primary"
            disabled={actions.submit.isPending || brand.verificationDocs.length === 0}
            onClick={handleSubmitReview}
          >
            {actions.submit.isPending ? 'Đang gửi...' : 'Gửi hồ sơ duyệt'}
          </button>
          {/* Nút mờ mà không nói lý do khiến người dùng tưởng hỏng: hồ sơ nằm
              mãi ở Bản nháp và đội duyệt không bao giờ thấy nó trong hàng chờ. */}
          {brand.verificationDocs.length === 0 ? (
            <p className="feedback">
              Cần tải lên ít nhất một giấy tờ xác minh ở mục trên rồi mới gửi duyệt được.
            </p>
          ) : null}
        </div>
      ) : null}
    </section>
  );
};
