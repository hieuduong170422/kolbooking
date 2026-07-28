import { NavLink } from 'react-router';

export const AppHeader = () => (
  <header className="app-header">
    <div className="app-header__inner">
      <NavLink to="/" className="app-header__brand">
        KOL<span>Booking</span>
      </NavLink>
      <nav className="app-header__nav" aria-label="Điều hướng chính">
        <NavLink
          to="/creators"
          className={({ isActive }) =>
            isActive ? 'app-header__link app-header__link--active' : 'app-header__link'
          }
        >
          Khám phá creator
        </NavLink>
      </nav>
    </div>
  </header>
);
