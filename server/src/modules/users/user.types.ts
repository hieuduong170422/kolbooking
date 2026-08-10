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

/**
 * DTO cho admin quản lý tài khoản (ADM-002, ADM-004) — có thêm status và
 * phiên bản consent so với UserDto công khai; KHÔNG bao giờ có passwordHash.
 */
export interface UserAdminDto {
  readonly id: string;
  readonly email: string;
  readonly displayName: string;
  readonly role: UserRole;
  readonly status: UserStatus;
  readonly emailVerified: boolean;
  readonly consentVersion: string | null;
  readonly createdAt: string;
}

export interface UserListFilter {
  /** Khớp một phần email hoặc tên hiển thị, không phân biệt hoa thường. */
  readonly search?: string | undefined;
  readonly role?: UserRole | undefined;
  readonly status?: UserStatus | undefined;
  readonly page: number;
  readonly limit: number;
}

export interface UserListResult {
  readonly items: readonly User[];
  readonly total: number;
}
