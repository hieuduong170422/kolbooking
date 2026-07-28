import type { NextFunction, Request, Response } from 'express';
import { describe, expect, it } from 'vitest';
import { requireRole } from '../src/modules/auth/auth.middleware.js';
import { signAccessToken, verifyAccessToken } from '../src/modules/auth/token.service.js';
import { hashPassword, verifyPassword } from '../src/modules/auth/password.service.js';
import { ApiError } from '../src/shared/errors/api-error.js';

const fakeResponse = (locals: Record<string, unknown>): Response =>
  ({ locals }) as unknown as Response;

const runMiddleware = (
  middleware: (req: Request, res: Response, next: NextFunction) => void,
  res: Response,
): unknown => {
  let captured: unknown;
  middleware({} as Request, res, (err?: unknown) => {
    captured = err;
  });
  return captured;
};

describe('requireRole', () => {
  it('cho qua khi role nằm trong danh sách cho phép', () => {
    const res = fakeResponse({ authUser: { userId: 'usr_1', role: 'admin' } });
    const error = runMiddleware(requireRole('admin'), res);
    expect(error).toBeUndefined();
  });

  it('trả FORBIDDEN khi role không được phép (AUTH-005)', () => {
    const res = fakeResponse({ authUser: { userId: 'usr_1', role: 'creator' } });
    const error = runMiddleware(requireRole('admin'), res);
    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).statusCode).toBe(403);
  });
});

describe('token.service', () => {
  it('sign rồi verify trả về đúng payload', async () => {
    const token = await signAccessToken({ userId: 'usr_42', role: 'brand' });
    const payload = await verifyAccessToken(token);
    expect(payload).toEqual({ userId: 'usr_42', role: 'brand' });
  });

  it('token bị sửa đổi trả về null', async () => {
    const token = await signAccessToken({ userId: 'usr_42', role: 'brand' });
    const payload = await verifyAccessToken(`${token}xx`);
    expect(payload).toBeNull();
  });
});

describe('password.service', () => {
  it('hash rồi verify đúng mật khẩu', async () => {
    const hash = await hashPassword('MatKhau123');
    expect(await verifyPassword('MatKhau123', hash)).toBe(true);
    expect(await verifyPassword('SaiRoi456', hash)).toBe(false);
  });

  it('hash sai định dạng trả false thay vì throw', async () => {
    expect(await verifyPassword('MatKhau123', 'khong-phai-hash')).toBe(false);
  });
});
