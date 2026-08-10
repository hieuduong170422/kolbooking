import { NavLink, Outlet } from 'react-router';
import { IconBriefcase, IconInbox, IconPackage, IconShield, IconStar, IconUser } from '../icons';

const NAV_ITEMS = [
  { to: '/admin/users', label: 'Tài khoản', Icon: IconUser },
  { to: '/admin/creators', label: 'Duyệt creator', Icon: IconStar },
  { to: '/admin/brands', label: 'Duyệt brand', Icon: IconBriefcase },
  { to: '/admin/packages', label: 'Package', Icon: IconPackage },
  { to: '/admin/reports', label: 'Báo cáo', Icon: IconShield },
  { to: '/admin/audit', label: 'Nhật ký', Icon: IconInbox },
] as const;

const navClass = ({ isActive }: { isActive: boolean }): string =>
  isActive ? 'admin-nav__link admin-nav__link--active' : 'admin-nav__link';

/**
 * Khung khu vực quản trị — sidebar riêng tách khỏi giao diện creator/brand.
 * Trên mobile sidebar thành thanh tab cuộn ngang.
 */
export const AdminLayout = () => (
  <div className="admin-shell">
    <aside className="admin-sidebar">
      <p className="admin-sidebar__title">Quản trị</p>
      <nav className="admin-nav" aria-label="Điều hướng quản trị">
        {NAV_ITEMS.map(({ to, label, Icon }) => (
          <NavLink key={to} to={to} className={navClass}>
            <Icon />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>
    </aside>
    <div className="admin-content">
      <Outlet />
    </div>
  </div>
);
