import { Navigate, Outlet, useLocation } from 'react-router';
import { useAuth } from '../../../features/auth/store/use-auth';
import { LoadingState } from '../feedback/loading-state';

/** Chặn route cần đăng nhập; guest bị chuyển về /login kèm đường dẫn quay lại. */
export const RequireAuth = () => {
  const { status } = useAuth();
  const location = useLocation();

  if (status === 'initializing') {
    return <LoadingState message="Đang khôi phục phiên đăng nhập..." />;
  }
  if (status === 'guest') {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }
  return <Outlet />;
};
