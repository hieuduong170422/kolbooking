import { useEffect, useRef, useState } from 'react';
import { NavLink, useNavigate } from 'react-router';
import { useAuth } from '../../../features/auth/store/use-auth';

const navLinkClass = ({ isActive }: { isActive: boolean }): string =>
  isActive ? 'app-header__link app-header__link--active' : 'app-header__link';

export const AppHeader = () => {
  const { status, user, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Đóng menu khi click ra ngoài vùng tên user hoặc bấm Escape (a11y).
  useEffect(() => {
    if (!menuOpen) return;

    const handleMouseDown = (event: MouseEvent): void => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        setMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [menuOpen]);

  const handleLogout = async (): Promise<void> => {
    setMenuOpen(false);
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
              <div className="app-header__user-menu" ref={userMenuRef}>
                <button
                  type="button"
                  className="app-header__user"
                  title={user.email}
                  aria-haspopup="menu"
                  aria-expanded={menuOpen}
                  onClick={() => setMenuOpen((open) => !open)}
                >
                  <span className="app-header__user-avatar" aria-hidden="true">
                    {user.displayName.charAt(0).toUpperCase()}
                  </span>
                  <span>{user.displayName}</span>
                  <span className="app-header__caret" aria-hidden="true">
                    ▾
                  </span>
                </button>
                {menuOpen && (
                  <div className="app-header__menu" role="menu">
                    <button
                      type="button"
                      role="menuitem"
                      className="app-header__menu-item"
                      onClick={() => void handleLogout()}
                    >
                      Đăng xuất
                    </button>
                  </div>
                )}
              </div>
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
