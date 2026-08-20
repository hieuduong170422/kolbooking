import { useEffect, useRef, useState, type ReactNode } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router';
import { useAuth } from '../../../features/auth/store/use-auth';
import type { AuthUser } from '../../../features/auth/types/auth-types';
import { NotificationBell } from '../../../features/notifications/notifications';
import { UnreadMessagesDot } from '../../../features/messages/components/unread-messages-dot';
import { IconClose, IconMenu } from '../icons';
import { Button, Dropdown, IconButton, LinkButton } from '../ui';
import { useDismiss } from '../ui/use-dismiss';

const navLinkClass = ({ isActive }: { isActive: boolean }): string =>
  isActive ? 'app-header__link app-header__link--active' : 'app-header__link';

interface NavItem {
  readonly to: string;
  readonly label: string;
  /** Chấm báo tin chưa đọc — đi kèm nhãn, không phải link riêng. */
  readonly badge?: ReactNode;
}

/**
 * Danh sách tab theo vai trò. Tách ra khỏi JSX để thanh ngang (desktop) và
 * ngăn kéo (mobile) dùng CHUNG một nguồn — thêm tab mới không còn phải nhớ
 * sửa hai chỗ.
 */
const buildNavItems = (user: AuthUser | null): readonly NavItem[] => {
  const items: NavItem[] = [{ to: '/creators', label: 'Khám phá creator' }];
  if (user === null) {
    return items;
  }

  items.push({ to: '/dashboard', label: 'Dashboard' });
  if (user.role !== 'admin') {
    items.push({ to: '/bookings', label: 'Booking' });
    items.push({ to: '/messages', label: 'Tin nhắn', badge: <UnreadMessagesDot /> });
  }
  if (user.role === 'brand') {
    items.push({ to: '/saved', label: 'Đã lưu' });
  }
  if (user.role === 'admin') {
    items.push({ to: '/admin/users', label: 'Quản trị' });
  }
  return items;
};

export const AppHeader = () => {
  const { status, user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const headerRef = useRef<HTMLElement>(null);

  useDismiss(menuOpen, headerRef, () => setMenuOpen(false));

  // Điều hướng xong thì đóng ngăn kéo — nếu không, trang mới hiện ra sau một
  // tấm menu che kín và người dùng tưởng bấm hụt.
  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  const authUser = status === 'authenticated' && user ? user : null;
  const navItems = buildNavItems(authUser);

  const handleLogout = async (): Promise<void> => {
    setMenuOpen(false);
    await logout();
    navigate('/creators');
  };

  const renderLinks = (className: string): ReactNode =>
    navItems.map((item) => (
      <NavLink
        key={item.to}
        to={item.to}
        className={({ isActive }) => `${navLinkClass({ isActive })} ${className}`}
      >
        {item.label}
        {item.badge}
      </NavLink>
    ));

  return (
    <header className="app-header" ref={headerRef}>
      <div className="app-header__inner">
        <NavLink to="/" className="app-header__brand">
          <span className="app-header__logo" aria-hidden="true">
            K
          </span>
          KOL<span>Booking</span>
        </NavLink>

        {/* Thanh ngang: màn rộng. CSS ẩn ở mobile, thay bằng nút menu bên dưới. */}
        <nav className="app-header__nav" aria-label="Điều hướng chính">
          {renderLinks('')}
          {authUser === null ? (
            <>
              <NavLink to="/login" className={navLinkClass}>
                Đăng nhập
              </NavLink>
              <LinkButton to="/register">Đăng ký</LinkButton>
            </>
          ) : (
            <>
              <NotificationBell />
              <Dropdown
                className="app-header__user-menu"
                triggerClassName="app-header__user"
                triggerTitle={authUser.email}
                trigger={
                  <>
                    <span className="app-header__user-avatar" aria-hidden="true">
                      {authUser.displayName.charAt(0).toUpperCase()}
                    </span>
                    <span>{authUser.displayName}</span>
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
          )}
        </nav>

        {/* Màn hẹp: chuông giữ nguyên chỗ dễ với, phần còn lại vào ngăn kéo. */}
        <div className="app-header__compact">
          {authUser === null ? null : <NotificationBell />}
          <IconButton
            label={menuOpen ? 'Đóng menu' : 'Mở menu'}
            icon={menuOpen ? <IconClose /> : <IconMenu />}
            className="app-header__menu-toggle"
            aria-expanded={menuOpen}
            aria-controls="app-header-drawer"
            onClick={() => setMenuOpen((open) => !open)}
          />
        </div>
      </div>

      {menuOpen ? (
        <nav id="app-header-drawer" className="app-header__drawer" aria-label="Điều hướng chính">
          {authUser === null ? null : (
            <div className="app-header__drawer-user">
              <span className="app-header__user-avatar" aria-hidden="true">
                {authUser.displayName.charAt(0).toUpperCase()}
              </span>
              <span className="app-header__drawer-identity">
                <strong>{authUser.displayName}</strong>
                <em>{authUser.email}</em>
              </span>
            </div>
          )}

          {renderLinks('app-header__drawer-link')}

          <div className="app-header__drawer-actions">
            {authUser === null ? (
              <>
                <LinkButton to="/login" variant="secondary" block>
                  Đăng nhập
                </LinkButton>
                <LinkButton to="/register" block>
                  Đăng ký
                </LinkButton>
              </>
            ) : (
              <Button variant="danger" block onClick={() => void handleLogout()}>
                Đăng xuất
              </Button>
            )}
          </div>
        </nav>
      ) : null}
    </header>
  );
};
