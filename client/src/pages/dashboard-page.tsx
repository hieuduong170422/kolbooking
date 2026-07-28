import { Link } from 'react-router';
import { useAuth } from '../features/auth/store/use-auth';
import { ROLE_LABELS } from '../features/auth/types/auth-types';

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
