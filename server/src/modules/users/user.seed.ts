import { hashPassword } from '../auth/password.service.js';
import type { User } from './user.types.js';

export const DEMO_PASSWORD = 'Demo@1234';

/**
 * Tài khoản demo cho môi trường dev/test (mật khẩu chung: Demo@1234).
 * Hash tính lúc khởi động để không hardcode hash trong source.
 */
export const buildUserSeed = async (): Promise<readonly User[]> => {
  const passwordHash = await hashPassword(DEMO_PASSWORD);
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
