import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { onSessionExpired } from '../../../shared/api/auth-session';
import * as authApi from '../api/auth-api';
import type { AuthUser, LoginInput, RegisterInput } from '../types/auth-types';
import { AuthContext, type AuthContextValue, type AuthStatus } from './auth-context';

interface AuthState {
  readonly status: AuthStatus;
  readonly user: AuthUser | null;
}

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [state, setState] = useState<AuthState>({ status: 'initializing', user: null });
  const queryClient = useQueryClient();

  /**
   * Xoá sạch cache khi phiên kết thúc. Cache chứa dữ liệu riêng của người
   * dùng (tin nhắn, booking, hồ sơ); nếu giữ lại, người đăng nhập kế tiếp
   * trên cùng tab sẽ thấy dữ liệu của người trước cho tới khi query refetch.
   */
  const endSession = useCallback((): void => {
    setState({ status: 'guest', user: null });
    queryClient.clear();
  }, [queryClient]);

  useEffect(() => {
    let cancelled = false;

    // Khôi phục phiên từ refresh cookie khi mở app.
    authApi
      .restoreSession()
      .then((user) => {
        if (!cancelled) setState({ status: 'authenticated', user });
      })
      .catch(() => {
        if (!cancelled) setState({ status: 'guest', user: null });
      });

    const unsubscribe = onSessionExpired(endSession);

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [endSession]);

  const login = useCallback(async (input: LoginInput) => {
    const user = await authApi.login(input);
    setState({ status: 'authenticated', user });
  }, []);

  const register = useCallback(async (input: RegisterInput) => {
    const user = await authApi.register(input);
    setState({ status: 'authenticated', user });
  }, []);

  const logout = useCallback(async () => {
    await authApi.logout();
    endSession();
  }, [endSession]);

  const updateUser = useCallback((user: AuthUser) => {
    setState((previous) => ({ ...previous, user }));
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ status: state.status, user: state.user, login, register, logout, updateUser }),
    [state, login, register, logout, updateUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
