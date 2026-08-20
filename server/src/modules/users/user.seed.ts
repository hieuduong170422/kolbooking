import { env } from '../../config/env.js';
import { hashPassword } from '../auth/password.service.js';
import type { User } from './user.types.js';

/** Mật khẩu demo mặc định — CÔNG KHAI, chỉ dùng cho máy dev và test. */
export const DEMO_PASSWORD = 'Demo@1234';

/**
 * Tài khoản demo cho môi trường dev/test. Hash tính lúc khởi động để không
 * hardcode hash trong source.
 *
 * Máy chạy thật (kể cả bản demo cho người ngoài xem) phải đặt
 * DEMO_SEED_PASSWORD — env.ts chặn boot nếu bật seed ở production mà quên.
 */
export const buildUserSeed = async (): Promise<readonly User[]> => {
  const passwordHash = await hashPassword(env.DEMO_SEED_PASSWORD ?? DEMO_PASSWORD);
  const seededAt = '2026-07-01T08:00:00.000Z';
  const consent = { version: '2026-08-mvp', acceptedAt: seededAt, source: 'seed' } as const;

  return [
    {
      id: 'usr_demo_creator',
      email: 'creator@demo.vn',
      passwordHash,
      displayName: 'Creator Demo',
      role: 'creator',
      status: 'active',
      emailVerifiedAt: seededAt,
      consent,
      createdAt: seededAt,
    },
    {
      // Creator ĐÃ DUYỆT, sở hữu crt_0001 (có package đang bán) — dùng để
      // chạy thử luồng booking hai phía. creator@demo.vn cố tình giữ hồ sơ
      // nháp để test onboarding và luật BR-001.
      id: 'usr_demo_creator_verified',
      email: 'creator2@demo.vn',
      passwordHash,
      displayName: 'Lan Chi Foodie',
      role: 'creator',
      status: 'active',
      emailVerifiedAt: seededAt,
      consent,
      createdAt: seededAt,
    },
    {
      id: 'usr_demo_brand',
      email: 'brand@demo.vn',
      passwordHash,
      displayName: 'Brand Demo',
      role: 'brand',
      status: 'active',
      emailVerifiedAt: seededAt,
      consent,
      createdAt: seededAt,
    },
    {
      id: 'usr_demo_admin',
      email: 'admin@demo.vn',
      passwordHash,
      displayName: 'Admin Demo',
      role: 'admin',
      status: 'active',
      emailVerifiedAt: seededAt,
      consent,
      createdAt: seededAt,
    },
    {
      id: 'usr_demo_locked',
      email: 'locked@demo.vn',
      passwordHash,
      displayName: 'Locked Demo',
      role: 'creator',
      status: 'locked',
      emailVerifiedAt: seededAt,
      consent,
      createdAt: seededAt,
    },
  ];
};
