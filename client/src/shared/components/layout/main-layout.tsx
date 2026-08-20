import { Link, Outlet } from 'react-router';
import { AppHeader } from './app-header';
import { ChatWidget } from '../../../features/messages/components/chat-widget';

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
      <nav className="app-footer__links" aria-label="Thông tin pháp lý">
        <Link to="/terms">Điều khoản sử dụng</Link>
        <Link to="/privacy">Chính sách quyền riêng tư</Link>
      </nav>
    </footer>
    <ChatWidget />
  </div>
);
