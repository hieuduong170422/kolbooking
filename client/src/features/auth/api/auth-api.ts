import { setAccessToken } from '../../../shared/api/auth-session';
import { apiPost, refreshSession, toApiClientError } from '../../../shared/api/http-client';
import type {
  AuthResponseData,
  AuthUser,
  LoginInput,
  RegisterInput,
} from '../types/auth-types';

export const login = async (input: LoginInput): Promise<AuthUser> => {
  const response = await apiPost<AuthResponseData>('/auth/login', input);
  setAccessToken(response.data.accessToken);
  return response.data.user;
};

export const register = async (input: RegisterInput): Promise<AuthUser> => {
  const response = await apiPost<AuthResponseData>('/auth/register', input);
  setAccessToken(response.data.accessToken);
  return response.data.user;
};

export const logout = async (): Promise<void> => {
  try {
    await apiPost('/auth/logout');
  } finally {
    setAccessToken(null);
  }
};

/** Khôi phục phiên từ refresh cookie khi mở app; throw nếu không có phiên. */
export const restoreSession = async (): Promise<AuthUser> => {
  try {
    const data = await refreshSession();
    return data.user as AuthUser;
  } catch (error) {
    throw toApiClientError(error);
  }
};
