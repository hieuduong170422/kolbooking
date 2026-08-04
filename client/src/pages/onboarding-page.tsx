import { CreatorProfileForm } from '../features/creators/components/creator-profile-form';
import { useCreatorProfile } from '../features/creators/hooks/use-creator-profile';
import { CREATOR_STATUS_LABELS } from '../features/creators/types/creator-types';
import { LoadingState } from '../shared/components/feedback/loading-state';

/** Trang /onboarding — tạo mới hoặc chỉnh sửa hồ sơ creator (CRE-001..006). */
export const OnboardingPage = () => {
  const { data, isLoading, isError } = useCreatorProfile();

  if (isLoading) {
    return (
      <section className="page">
        <LoadingState message="Đang tải hồ sơ..." />
      </section>
    );
  }

  // 404 → chưa có hồ sơ → tạo mới; có hồ sơ → chỉnh sửa + hiển thị trạng thái.
  const profile = isError ? null : data ?? null;
  const isLocked =
    profile !== null && (profile.status === 'pending_review' || profile.status === 'suspended');

  return (
    <section className="page">
      <div className="page__header">
        <h1>Hồ sơ creator</h1>
        <p className="page__subtitle">
          {profile === null
            ? 'Hoàn thiện hồ sơ để bắt đầu nhận booking (CRE-001..006).'
            : (
              <>
                Trạng thái: <span className="badge">{CREATOR_STATUS_LABELS[profile.status]}</span>
              </>
            )}
        </p>
      </div>

      {profile !== null && profile.status === 'verified' ? (
        <p className="onboarding-note" role="status">
          Chỉnh sửa sẽ đưa hồ sơ về trạng thái chờ duyệt.
        </p>
      ) : null}
      {isLocked && profile !== null ? (
        <p className="onboarding-note onboarding-note--danger" role="status">
          Hồ sơ đang bị khóa ở trạng thái {CREATOR_STATUS_LABELS[profile.status]} — không thể chỉnh
          sửa.
        </p>
      ) : null}

      <CreatorProfileForm profile={profile} readOnly={isLocked} />
    </section>
  );
};
