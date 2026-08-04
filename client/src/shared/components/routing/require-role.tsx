import type { ReactNode } from 'react';
import { Navigate } from 'react-router';
import { useAuth } from '../../../features/auth/store/use-auth';
import type { AuthUser } from '../../../features/auth/types/auth-types';

interface RequireRoleProps {
  readonly role: AuthUser['role'];
  readonly children: ReactNode;
}

/** Chặn route theo vai trò (AUTH-005): guest về /login, sai vai trò về /dashboard. */
export const RequireRole = ({ role, children }: RequireRoleProps) => {
  const { user } = useAuth();

  if (!user) {
    return <Navigate to="/login" replace />;
  }
  if (user.role !== role) {
    return <Navigate to="/dashboard" replace />;
  }
  return children;
};
