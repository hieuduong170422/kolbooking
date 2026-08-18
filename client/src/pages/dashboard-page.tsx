import { useAuth } from '../features/auth/store/use-auth';
import { LinkButton } from '../shared/components/ui';
import { ROLE_LABELS } from '../features/auth/types/auth-types';
import { StatusBanner } from '../features/creators/components/status-banner';
import { useCreatorProfile } from '../features/creators/hooks/use-creator-profile';
import { CREATOR_STATUS_LABELS } from '../features/creators/types/creator-types';
import {
  IconBriefcase,
  IconClock,
  IconPackage,
  IconSearch,
  IconShield,
  IconUser,
} from '../shared/components/icons';

/** Card hồ sơ creator — render riêng để hook useCreatorProfile gọi vô điều kiện trong component này. */
const CreatorProfileCard = () => {
  const { data: profile, isPending, isError } = useCreatorProfile();

  return (
    <div className="dashboard-card">
      <span className="dashboard-card__icon" aria-hidden="true">
        <IconUser />
      </span>
      <h2>Hồ sơ creator</h2>
      {isPending ? (
        <p>Đang tải trạng thái hồ sơ...</p>
      ) : isError ? (
        <>
          <p>Bạn chưa có hồ sơ creator — tạo ngay để bắt đầu nhận booking.</p>
          <LinkButton to="/onboarding">
            Tạo hồ sơ ngay
          </LinkButton>
        </>
      ) : profile ? (
        <>
          <span className="badge">{CREATOR_STATUS_LABELS[profile.status]}</span>
          <StatusBanner status={profile.status} statusReason={profile.statusReason} />
          <LinkButton to="/onboarding" variant="secondary">
            Quản lý hồ sơ
          </LinkButton>
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

      {!user.emailVerified ? (
        <div className="notice notice--warning">
          <p>
            Tài khoản chưa xác minh email — bạn chưa thể gửi hồ sơ duyệt hay tạo booking.
          </p>
          <LinkButton to="/verify-email">
            Xác minh ngay
          </LinkButton>
        </div>
      ) : null}

      <div className="dashboard-grid">
        {user.role === 'creator' ? <CreatorProfileCard /> : null}
        <div className="dashboard-card">
          <span className="dashboard-card__icon" aria-hidden="true">
            <IconSearch />
          </span>
          <h2>Khám phá creator</h2>
          <p>Tìm creator theo lĩnh vực, khu vực và ngân sách.</p>
          <LinkButton to="/creators">
            Bắt đầu tìm
          </LinkButton>
        </div>
        {user.role !== 'admin' ? (
          <div className="dashboard-card">
            <span className="dashboard-card__icon" aria-hidden="true">
              <IconClock />
            </span>
            <h2>Booking của tôi</h2>
            <p>Theo dõi yêu cầu, brief đã chốt và việc cần làm tiếp.</p>
            <LinkButton to="/bookings">
              Xem booking
            </LinkButton>
          </div>
        ) : null}
        {user.role === 'creator' ? (
          <div className="dashboard-card">
            <span className="dashboard-card__icon" aria-hidden="true">
              <IconPackage />
            </span>
            <h2>Gói dịch vụ của tôi</h2>
            <p>Tạo package chuẩn hóa: đầu ra, giá, deadline, quyền sử dụng.</p>
            <LinkButton to="/my-packages">
              Quản lý package
            </LinkButton>
          </div>
        ) : null}
        {user.role === 'brand' ? (
          <div className="dashboard-card">
            <span className="dashboard-card__icon" aria-hidden="true">
              <IconBriefcase />
            </span>
            <h2>Hồ sơ brand</h2>
            <p>Hoàn thiện hồ sơ và xác minh để bắt đầu booking creator.</p>
            <LinkButton to="/brand-onboarding">
              Quản lý hồ sơ
            </LinkButton>
          </div>
        ) : null}
        {user.role === 'admin' ? (
          <div className="dashboard-card">
            <span className="dashboard-card__icon" aria-hidden="true">
              <IconShield />
            </span>
            <h2>Khu vực quản trị</h2>
            <p>Quản lý tài khoản, duyệt hồ sơ creator/brand và xem nhật ký hoạt động.</p>
            <LinkButton to="/admin/users">
              Mở khu quản trị
            </LinkButton>
          </div>
        ) : null}
      </div>
    </section>
  );
};
