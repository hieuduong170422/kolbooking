/**
 * Giữ access token trong bộ nhớ (không localStorage — giảm rủi ro XSS).
 * Refresh token nằm trong httpOnly cookie do server quản lý.
 */

type SessionExpiredListener = () => void;

let accessToken: string | null = null;
const listeners = new Set<SessionExpiredListener>();

export const getAccessToken = (): string | null => accessToken;

export const setAccessToken = (token: string | null): void => {
  accessToken = token;
};

/** Đăng ký lắng nghe khi phiên hết hạn hẳn (refresh thất bại). */
export const onSessionExpired = (listener: SessionExpiredListener): (() => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export const notifySessionExpired = (): void => {
  accessToken = null;
  for (const listener of listeners) {
    listener();
  }
};
