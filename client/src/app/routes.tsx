import { Navigate, Route, Routes } from 'react-router';
import { MainLayout } from '../shared/components/layout/main-layout';
import { RequireAuth } from '../shared/components/routing/require-auth';
import { CreatorDetailPage } from '../pages/creator-detail-page';
import { CreatorsPage } from '../pages/creators-page';
import { DashboardPage } from '../pages/dashboard-page';
import { LoginPage } from '../pages/login-page';
import { NotFoundPage } from '../pages/not-found-page';
import { RegisterPage } from '../pages/register-page';

export const AppRoutes = () => (
  <Routes>
    <Route element={<MainLayout />}>
      {/* Public */}
      <Route index element={<Navigate to="/creators" replace />} />
      <Route path="/creators" element={<CreatorsPage />} />
      <Route path="/creators/:id" element={<CreatorDetailPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      {/* Cần đăng nhập */}
      <Route element={<RequireAuth />}>
        <Route path="/dashboard" element={<DashboardPage />} />
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Route>
  </Routes>
);
