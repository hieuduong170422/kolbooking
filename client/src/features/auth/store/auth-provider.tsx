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

    const unsubscribe = onSessionExpired(() => {
      setState({ status: 'guest', user: null });
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, []);

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
    setState({ status: 'guest', user: null });
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ status: state.status, user: state.user, login, register, logout }),
    [state, login, register, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
