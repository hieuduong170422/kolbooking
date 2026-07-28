import type { User, UserDto } from './user.types.js';

/** Entity → DTO: tuyệt đối không để passwordHash/status nội bộ lọt ra ngoài. */
export const toUserDto = (user: User): UserDto => ({
  id: user.id,
  email: user.email,
  displayName: user.displayName,
  role: user.role,
  emailVerified: user.emailVerifiedAt !== null,
  createdAt: user.createdAt,
});
