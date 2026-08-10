import { setAccessToken } from '../../../shared/api/auth-session';
import { apiPost, refreshSession, toApiClientError } from '../../../shared/api/http-client';
import type {
  AuthResponseData,
  AuthUser,
  LoginInput,
  RegisterInput,
  ResetPasswordInput,
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

/** AUTH-002: gửi (lại) mã OTP xác minh email cho user đang đăng nhập. */
export const requestEmailVerification = async (): Promise<void> => {
  await apiPost('/auth/verify-email/request');
};

/** AUTH-002: xác nhận OTP — trả về user đã cập nhật emailVerified. */
export const confirmEmailVerification = async (code: string): Promise<AuthUser> => {
  const response = await apiPost<{ user: AuthUser }>('/auth/verify-email/confirm', { code });
  return response.data.user;
};

/** AUTH-004: yêu cầu mã đặt lại mật khẩu — luôn thành công, không lộ tài khoản. */
export const forgotPassword = async (email: string): Promise<void> => {
  await apiPost('/auth/password/forgot', { email });
};

/** AUTH-004: đặt lại mật khẩu bằng mã OTP nhận qua email. */
export const resetPassword = async (input: ResetPasswordInput): Promise<void> => {
  await apiPost('/auth/password/reset', input);
};
