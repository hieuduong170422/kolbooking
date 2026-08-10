import type { User, UserAdminDto, UserDto } from './user.types.js';

/** Entity → DTO: tuyệt đối không để passwordHash/status nội bộ lọt ra ngoài. */
export const toUserDto = (user: User): UserDto => ({
  id: user.id,
  email: user.email,
  displayName: user.displayName,
  role: user.role,
  emailVerified: user.emailVerifiedAt !== null,
  createdAt: user.createdAt,
});

/** DTO cho màn quản trị — thêm status/consent, vẫn không có passwordHash (ADM-002). */
export const toUserAdminDto = (user: User): UserAdminDto => ({
  id: user.id,
  email: user.email,
  displayName: user.displayName,
  role: user.role,
  status: user.status,
  emailVerified: user.emailVerifiedAt !== null,
  consentVersion: user.consent?.version ?? null,
  createdAt: user.createdAt,
});
