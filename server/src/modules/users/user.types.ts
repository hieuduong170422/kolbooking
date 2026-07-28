export const USER_ROLES = ['creator', 'brand', 'admin'] as const;
export type UserRole = (typeof USER_ROLES)[number];

/** Role được phép tự đăng ký — admin chỉ tạo qua vận hành (AUTH-005). */
export const SELF_REGISTER_ROLES = ['creator', 'brand'] as const;
export type SelfRegisterRole = (typeof SELF_REGISTER_ROLES)[number];

export const USER_STATUSES = ['active', 'locked'] as const;
export type UserStatus = (typeof USER_STATUSES)[number];

/** Domain entity — passwordHash không bao giờ rời khỏi tầng service. */
export interface User {
  readonly id: string;
  readonly email: string;
  readonly passwordHash: string;
  readonly displayName: string;
  readonly role: UserRole;
  readonly status: UserStatus;
  readonly emailVerifiedAt: string | null;
  readonly createdAt: string;
}

/** DTO trả về client — không chứa passwordHash. */
export interface UserDto {
  readonly id: string;
  readonly email: string;
  readonly displayName: string;
  readonly role: UserRole;
  readonly emailVerified: boolean;
  readonly createdAt: string;
}

export interface CreateUserInput {
  readonly email: string;
  readonly passwordHash: string;
  readonly displayName: string;
  readonly role: SelfRegisterRole;
}
