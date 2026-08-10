export const USER_ROLES = ['creator', 'brand', 'admin'] as const;
export type UserRole = (typeof USER_ROLES)[number];

/** Role được phép tự đăng ký — admin chỉ tạo qua vận hành (AUTH-005). */
export const SELF_REGISTER_ROLES = ['creator', 'brand'] as const;
export type SelfRegisterRole = (typeof SELF_REGISTER_ROLES)[number];

export const USER_STATUSES = ['active', 'locked'] as const;
export type UserStatus = (typeof USER_STATUSES)[number];

/** Ghi nhận chấp thuận điều khoản tại thời điểm đăng ký (AUTH-007). */
export interface UserConsent {
  readonly version: string;
  readonly acceptedAt: string;
  readonly source: string;
}

/** Domain entity — passwordHash không bao giờ rời khỏi tầng service. */
export interface User {
  readonly id: string;
  readonly email: string;
  readonly passwordHash: string;
  readonly displayName: string;
  readonly role: UserRole;
  readonly status: UserStatus;
  readonly emailVerifiedAt: string | null;
  readonly consent: UserConsent | null;
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
  readonly consent: UserConsent;
}

/** Các trường được phép cập nhật sau khi tạo — immutable: repository trả bản ghi mới. */
export interface UserPatch {
  readonly passwordHash?: string;
  readonly emailVerifiedAt?: string | null;
  readonly status?: UserStatus;
}
