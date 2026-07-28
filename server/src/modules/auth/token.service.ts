import { createHash, randomBytes } from 'node:crypto';
import { SignJWT, jwtVerify } from 'jose';
import { env } from '../../config/env.js';
import type { UserRole } from '../users/user.types.js';

const jwtSecret = new TextEncoder().encode(env.JWT_SECRET);
const JWT_ISSUER = 'kolbooking-api';

export interface AccessTokenPayload {
  readonly userId: string;
  readonly role: UserRole;
}

export const signAccessToken = async (payload: AccessTokenPayload): Promise<string> =>
  new SignJWT({ role: payload.role })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(payload.userId)
    .setIssuer(JWT_ISSUER)
    .setIssuedAt()
    .setExpirationTime(`${env.ACCESS_TOKEN_TTL_SECONDS}s`)
    .sign(jwtSecret);

/** Trả về payload nếu token hợp lệ, null nếu sai/hết hạn — caller quyết định 401. */
export const verifyAccessToken = async (token: string): Promise<AccessTokenPayload | null> => {
  try {
    const { payload } = await jwtVerify(token, jwtSecret, { issuer: JWT_ISSUER });
    if (typeof payload.sub !== 'string' || typeof payload['role'] !== 'string') return null;
    return { userId: payload.sub, role: payload['role'] as UserRole };
  } catch {
    return null;
  }
};

/** Refresh token là chuỗi ngẫu nhiên opaque; chỉ lưu hash trong hệ thống. */
export const generateRefreshToken = (): string => randomBytes(48).toString('hex');

export const hashRefreshToken = (token: string): string =>
  createHash('sha256').update(token).digest('hex');
