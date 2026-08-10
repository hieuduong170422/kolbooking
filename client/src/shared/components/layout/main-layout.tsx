import { Outlet } from 'react-router';
import { AppHeader } from './app-header';

export const MainLayout = () => (
  <div className="app-shell">
    <AppHeader />
    <main className="app-main">
      <Outlet />
    </main>
    <footer className="app-footer">
      <p className="app-footer__brand">
        <span className="app-footer__logo" aria-hidden="true">
          K
        </span>
        KOL Booking
      </p>
      <p>Booking trực tiếp giữa local brand và nano/micro creator — rõ giá, rõ deadline, rõ quyền sử dụng.</p>
    </footer>
  </div>
);
