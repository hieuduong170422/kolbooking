import type { NextFunction, Request, Response } from 'express';
import { ApiError } from '../../shared/errors/api-error.js';
import type { UserRole } from '../users/user.types.js';
import { verifyAccessToken, type AccessTokenPayload } from './token.service.js';

const AUTH_USER_KEY = 'authUser';

export const getAuthUser = (res: Response): AccessTokenPayload =>
  res.locals[AUTH_USER_KEY] as AccessTokenPayload;

/** Bắt buộc có access token hợp lệ; payload gắn vào res.locals cho controller. */
export const requireAuth = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const header = req.headers.authorization;
  const token = header?.startsWith('Bearer ') ? header.slice('Bearer '.length) : null;
  if (!token) {
    next(ApiError.unauthorized());
    return;
  }

  const payload = await verifyAccessToken(token);
  if (!payload) {
    next(ApiError.unauthorized('Phiên đăng nhập hết hạn hoặc không hợp lệ.'));
    return;
  }

  res.locals[AUTH_USER_KEY] = payload;
  next();
};

/** RBAC theo role (AUTH-005) — dùng SAU requireAuth. */
export const requireRole =
  (...allowedRoles: readonly UserRole[]) =>
  (_req: Request, res: Response, next: NextFunction): void => {
    const authUser = getAuthUser(res);
    if (!authUser || !allowedRoles.includes(authUser.role)) {
      next(ApiError.forbidden());
      return;
    }
    next();
  };
