import { Navigate, Route, Routes } from 'react-router';
import { MainLayout } from '../shared/components/layout/main-layout';
import { CreatorDetailPage } from '../pages/creator-detail-page';
import { CreatorsPage } from '../pages/creators-page';
import { NotFoundPage } from '../pages/not-found-page';

export const AppRoutes = () => (
  <Routes>
    <Route element={<MainLayout />}>
      <Route index element={<Navigate to="/creators" replace />} />
      <Route path="/creators" element={<CreatorsPage />} />
      <Route path="/creators/:id" element={<CreatorDetailPage />} />
      <Route path="*" element={<NotFoundPage />} />
    </Route>
  </Routes>
);
