import { createContext } from 'react';
import type { AuthUser, LoginInput, RegisterInput } from '../types/auth-types';

export type AuthStatus = 'initializing' | 'authenticated' | 'guest';

export interface AuthContextValue {
  readonly status: AuthStatus;
  readonly user: AuthUser | null;
  readonly login: (input: LoginInput) => Promise<void>;
  readonly register: (input: RegisterInput) => Promise<void>;
  readonly logout: () => Promise<void>;
  /** Cập nhật user trong store sau khi server đổi trạng thái (vd xác minh email). */
  readonly updateUser: (user: AuthUser) => void;
}

export const AuthContext = createContext<AuthContextValue | null>(null);
