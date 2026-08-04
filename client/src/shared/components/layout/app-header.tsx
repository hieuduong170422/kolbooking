import { NavLink, useNavigate } from 'react-router';
import { useAuth } from '../../../features/auth/store/use-auth';

const navLinkClass = ({ isActive }: { isActive: boolean }): string =>
  isActive ? 'app-header__link app-header__link--active' : 'app-header__link';

export const AppHeader = () => {
  const { status, user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async (): Promise<void> => {
    await logout();
    navigate('/creators');
  };

  return (
    <header className="app-header">
      <div className="app-header__inner">
        <NavLink to="/" className="app-header__brand">
          KOL<span>Booking</span>
        </NavLink>
        <nav className="app-header__nav" aria-label="Điều hướng chính">
          <NavLink to="/creators" className={navLinkClass}>
            Khám phá creator
          </NavLink>
          {status === 'authenticated' && user ? (
            <>
              <NavLink to="/dashboard" className={navLinkClass}>
                Dashboard
              </NavLink>
              {user.role === 'admin' && (
                <NavLink to="/admin/creators" className={navLinkClass}>
                  Quản trị
                </NavLink>
              )}
              <span className="app-header__user" title={user.email}>
                {user.displayName}
              </span>
              <button
                type="button"
                className="button button--secondary"
                onClick={() => void handleLogout()}
              >
                Đăng xuất
              </button>
            </>
          ) : (
            <>
              <NavLink to="/login" className={navLinkClass}>
                Đăng nhập
              </NavLink>
              <NavLink to="/register" className="button button--primary">
                Đăng ký
              </NavLink>
            </>
          )}
        </nav>
      </div>
    </header>
  );
};
