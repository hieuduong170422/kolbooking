import { Navigate, Route, Routes } from 'react-router';
import { MainLayout } from '../shared/components/layout/main-layout';
import { RequireAuth } from '../shared/components/routing/require-auth';
import { RequireRole } from '../shared/components/routing/require-role';
import { AdminBrandsPage } from '../pages/admin-brands-page';
import { AdminCreatorsPage } from '../pages/admin-creators-page';
import { BrandOnboardingPage } from '../pages/brand-onboarding-page';
import { CreatorDetailPage } from '../pages/creator-detail-page';
import { CreatorsPage } from '../pages/creators-page';
import { DashboardPage } from '../pages/dashboard-page';
import { ForgotPasswordPage } from '../pages/forgot-password-page';
import { LoginPage } from '../pages/login-page';
import { MyPackagesPage } from '../pages/my-packages-page';
import { NotFoundPage } from '../pages/not-found-page';
import { OnboardingPage } from '../pages/onboarding-page';
import { RegisterPage } from '../pages/register-page';
import { VerifyEmailPage } from '../pages/verify-email-page';

export const AppRoutes = () => (
  <Routes>
    <Route element={<MainLayout />}>
      {/* Public */}
      <Route index element={<Navigate to="/creators" replace />} />
      <Route path="/creators" element={<CreatorsPage />} />
      <Route path="/creators/:id" element={<CreatorDetailPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />

      {/* Cần đăng nhập */}
      <Route element={<RequireAuth />}>
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/verify-email" element={<VerifyEmailPage />} />
        <Route
          path="/onboarding"
          element={
            <RequireRole role="creator">
              <OnboardingPage />
            </RequireRole>
          }
        />
        <Route
          path="/my-packages"
          element={
            <RequireRole role="creator">
              <MyPackagesPage />
            </RequireRole>
          }
        />
        <Route
          path="/brand-onboarding"
          element={
            <RequireRole role="brand">
              <BrandOnboardingPage />
            </RequireRole>
          }
        />
        <Route
          path="/admin/creators"
          element={
            <RequireRole role="admin">
              <AdminCreatorsPage />
            </RequireRole>
          }
        />
        <Route
          path="/admin/brands"
          element={
            <RequireRole role="admin">
              <AdminBrandsPage />
            </RequireRole>
          }
        />
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Route>
  </Routes>
);
