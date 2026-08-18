import { useNavigate } from 'react-router';
import { NavLink } from 'react-router';
import { useAuth } from '../../../features/auth/store/use-auth';
import { NotificationBell } from '../../../features/notifications/notifications';
import { UnreadMessagesDot } from '../../../features/messages/components/unread-messages-dot';
import { Dropdown, LinkButton } from '../ui';

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
          <span className="app-header__logo" aria-hidden="true">
            K
          </span>
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
              {user.role !== 'admin' && (
                <>
                  <NavLink to="/bookings" className={navLinkClass}>
                    Booking
                  </NavLink>
                  <NavLink to="/messages" className={navLinkClass}>
                    Tin nhắn
                    <UnreadMessagesDot />
                  </NavLink>
                </>
              )}
              {user.role === 'brand' && (
                <NavLink to="/saved" className={navLinkClass}>
                  Đã lưu
                </NavLink>
              )}
              {user.role === 'admin' && (
                <NavLink to="/admin/users" className={navLinkClass}>
                  Quản trị
                </NavLink>
              )}
              <NotificationBell />
              <Dropdown
                className="app-header__user-menu"
                triggerClassName="app-header__user"
                triggerTitle={user.email}
                trigger={
                  <>
                    <span className="app-header__user-avatar" aria-hidden="true">
                      {user.displayName.charAt(0).toUpperCase()}
                    </span>
                    <span>{user.displayName}</span>
                    <span className="app-header__caret" aria-hidden="true">
                      ▾
                    </span>
                  </>
                }
                items={[
                  {
                    key: 'logout',
                    label: 'Đăng xuất',
                    tone: 'danger',
                    onSelect: () => void handleLogout(),
                  },
                ]}
              />
            </>
          ) : (
            <>
              <NavLink to="/login" className={navLinkClass}>
                Đăng nhập
              </NavLink>
              <LinkButton to="/register">Đăng ký</LinkButton>
            </>
          )}
        </nav>
      </div>
    </header>
  );
};
