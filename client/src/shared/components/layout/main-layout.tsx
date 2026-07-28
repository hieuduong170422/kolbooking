import { Outlet } from 'react-router';
import { AppHeader } from './app-header';

export const MainLayout = () => (
  <div className="app-shell">
    <AppHeader />
    <main className="app-main">
      <Outlet />
    </main>
    <footer className="app-footer">
      <p>KOL Booking — Creator Marketplace MVP</p>
    </footer>
  </div>
);
