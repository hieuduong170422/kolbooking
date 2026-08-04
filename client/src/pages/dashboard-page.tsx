import { Link } from 'react-router';
import { useAuth } from '../features/auth/store/use-auth';
import { ROLE_LABELS } from '../features/auth/types/auth-types';
import { StatusBanner } from '../features/creators/components/status-banner';
import { useCreatorProfile } from '../features/creators/hooks/use-creator-profile';
import { CREATOR_STATUS_LABELS } from '../features/creators/types/creator-types';

/** Card hồ sơ creator — render riêng để hook useCreatorProfile gọi vô điều kiện trong component này. */
const CreatorProfileCard = () => {
  const { data: profile, isPending, isError } = useCreatorProfile();

  return (
    <div className="dashboard-card">
      <h2>Hồ sơ creator</h2>
      {isPending ? (
        <p>Đang tải trạng thái hồ sơ...</p>
      ) : isError ? (
        <>
          <p>Bạn chưa có hồ sơ creator — tạo ngay để bắt đầu nhận booking.</p>
          <Link to="/onboarding" className="button button--primary">
            Tạo hồ sơ ngay
          </Link>
        </>
      ) : profile ? (
        <>
          <span className="badge">{CREATOR_STATUS_LABELS[profile.status]}</span>
          <StatusBanner status={profile.status} statusReason={profile.statusReason} />
          <Link to="/onboarding" className="button button--secondary">
            Quản lý hồ sơ
          </Link>
        </>
      ) : null}
    </div>
  );
};

/** Trang sau đăng nhập — placeholder cho dashboard Brand/Creator (Epic E3+). */
export const DashboardPage = () => {
  const { user } = useAuth();
  if (!user) return null;

  return (
    <section className="page">
      <div className="page__header">
        <h1>Xin chào, {user.displayName}</h1>
        <p className="page__subtitle">
          Vai trò: <span className="badge">{ROLE_LABELS[user.role]}</span>
          {' · '}
          {user.emailVerified ? 'Email đã xác minh' : 'Email chưa xác minh'}
        </p>
      </div>

      <div className="dashboard-grid">
        {user.role === 'creator' ? <CreatorProfileCard /> : null}
        <div className="dashboard-card">
          <h2>Khám phá creator</h2>
          <p>Tìm creator theo lĩnh vực, khu vực và ngân sách.</p>
          <Link to="/creators" className="button button--primary">
            Bắt đầu tìm
          </Link>
        </div>
        <div className="dashboard-card dashboard-card--muted">
          <h2>Booking của tôi</h2>
          <p>Quản lý booking, brief và deliverable — sẽ có ở Epic E3.</p>
          <button type="button" className="button button--secondary" disabled>
            Sắp ra mắt
          </button>
        </div>
        <div className="dashboard-card dashboard-card--muted">
          <h2>{user.role === 'creator' ? 'Gói dịch vụ của tôi' : 'Creator đã lưu'}</h2>
          <p>
            {user.role === 'creator'
              ? 'Tạo và quản lý service package — sẽ có ở Epic E2.'
              : 'Danh sách creator yêu thích — sẽ có ở Epic E2.'}
          </p>
          <button type="button" className="button button--secondary" disabled>
            Sắp ra mắt
          </button>
        </div>
      </div>
    </section>
  );
};
