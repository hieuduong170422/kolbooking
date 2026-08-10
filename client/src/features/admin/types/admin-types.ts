import type { AuthRole } from '../../auth/types/auth-types';

/** Mirror UserAdminDto phía server (ADM-002). */
export const USER_STATUSES = ['active', 'locked'] as const;
export type UserStatus = (typeof USER_STATUSES)[number];

export interface AdminUser {
  readonly id: string;
  readonly email: string;
  readonly displayName: string;
  readonly role: AuthRole;
  readonly status: UserStatus;
  readonly emailVerified: boolean;
  readonly consentVersion: string | null;
  readonly createdAt: string;
}

export interface UserListFilter {
  readonly search?: string;
  readonly role?: AuthRole;
  readonly status?: UserStatus;
  readonly page: number;
  readonly limit: number;
}

export const USER_STATUS_LABELS: Record<UserStatus, string> = {
  active: 'Đang hoạt động',
  locked: 'Đã khóa',
};

/** Mirror AuditEntryDto phía server (ADM-009). */
export const AUDIT_TARGET_TYPES = ['user', 'creator', 'brand', 'package'] as const;
export type AuditTargetType = (typeof AUDIT_TARGET_TYPES)[number];

export interface AuditEntry {
  readonly id: string;
  readonly actorId: string;
  readonly actorEmail: string;
  readonly action: string;
  readonly targetType: string;
  readonly targetId: string;
  readonly before: unknown;
  readonly after: unknown;
  readonly reason: string | null;
  readonly createdAt: string;
}

export interface AuditListFilter {
  readonly targetType?: AuditTargetType;
  readonly action?: string;
  readonly page: number;
  readonly limit: number;
}

export const AUDIT_TARGET_LABELS: Record<AuditTargetType, string> = {
  user: 'Tài khoản',
  creator: 'Creator',
  brand: 'Brand',
  package: 'Package',
};

/** Nhãn tiếng Việt cho action — fallback về mã gốc nếu chưa khai báo. */
export const AUDIT_ACTION_LABELS: Record<string, string> = {
  'user.lock': 'Khóa tài khoản',
  'user.unlock': 'Mở khóa tài khoản',
  'creator.submit': 'Creator gửi hồ sơ duyệt',
  'creator.review.approve': 'Duyệt hồ sơ creator',
  'creator.review.reject': 'Từ chối hồ sơ creator',
  'creator.review.request_info': 'Yêu cầu bổ sung hồ sơ creator',
  'creator.review.suspend': 'Tạm khóa hồ sơ creator',
  'brand.submit': 'Brand gửi hồ sơ duyệt',
  'brand.review.approve': 'Duyệt hồ sơ brand',
  'brand.review.reject': 'Từ chối hồ sơ brand',
  'brand.review.request_info': 'Yêu cầu bổ sung hồ sơ brand',
  'brand.review.suspend': 'Tạm khóa hồ sơ brand',
  'package.hide': 'Ẩn package',
  'package.unhide': 'Khôi phục package',
};
