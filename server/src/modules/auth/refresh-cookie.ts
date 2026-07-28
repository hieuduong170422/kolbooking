import type { Request, Response } from 'express';
import { env } from '../../config/env.js';

export const REFRESH_COOKIE_NAME = 'kb_refresh';
const DAY_MS = 24 * 60 * 60 * 1000;

const cookieOptions = {
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: env.NODE_ENV === 'production',
  path: '/api/v1/auth',
};

/** Refresh token đi qua httpOnly cookie — JS phía client không đọc được (SEC-001). */
export const setRefreshCookie = (res: Response, refreshToken: string): void => {
  res.cookie(REFRESH_COOKIE_NAME, refreshToken, {
    ...cookieOptions,
    maxAge: env.REFRESH_TOKEN_TTL_DAYS * DAY_MS,
  });
};

export const clearRefreshCookie = (res: Response): void => {
  res.clearCookie(REFRESH_COOKIE_NAME, cookieOptions);
};

export const readRefreshCookie = (req: Request): string | null => {
  const value = (req.cookies as Record<string, unknown> | undefined)?.[REFRESH_COOKIE_NAME];
  return typeof value === 'string' && value.length > 0 ? value : null;
};
