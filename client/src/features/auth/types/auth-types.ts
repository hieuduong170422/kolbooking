export const AUTH_ROLES = ['creator', 'brand', 'admin'] as const;
export type AuthRole = (typeof AUTH_ROLES)[number];

export const SELF_REGISTER_ROLES = ['creator', 'brand'] as const;
export type SelfRegisterRole = (typeof SELF_REGISTER_ROLES)[number];

/** Mirror UserDto phía server. */
export interface AuthUser {
  readonly id: string;
  readonly email: string;
  readonly displayName: string;
  readonly role: AuthRole;
  readonly emailVerified: boolean;
  readonly createdAt: string;
}

export interface LoginInput {
  readonly email: string;
  readonly password: string;
}

export interface RegisterInput {
  readonly email: string;
  readonly password: string;
  readonly displayName: string;
  readonly role: SelfRegisterRole;
  /** AUTH-007: bắt buộc tick đồng ý điều khoản — server từ chối nếu thiếu. */
  readonly termsAccepted: boolean;
}

export interface ResetPasswordInput {
  readonly email: string;
  readonly code: string;
  readonly newPassword: string;
}

export interface AuthResponseData {
  readonly user: AuthUser;
  readonly accessToken: string;
}

export const ROLE_LABELS: Record<AuthRole, string> = {
  creator: 'Creator',
  brand: 'Brand',
  admin: 'Quản trị viên',
};
