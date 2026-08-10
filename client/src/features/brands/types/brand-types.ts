/** Mirror server brand.types.ts — BRD-001..BRD-005, BRD-007. */

export const BRAND_ENTITY_TYPES = ['individual', 'household', 'company'] as const;
export type BrandEntityType = (typeof BRAND_ENTITY_TYPES)[number];

export const BRAND_STATUSES = [
  'draft',
  'pending_review',
  'verified',
  'rejected',
  'suspended',
  'info_required',
] as const;
export type BrandStatus = (typeof BRAND_STATUSES)[number];

export interface BrandVerificationDoc {
  readonly id: string;
  readonly fileName: string;
  readonly storageKey: string;
  readonly uploadedAt: string;
}

export interface BrandContact {
  readonly name: string;
  readonly email: string;
  readonly phone: string;
}

/** DTO chính chủ. */
export interface BrandOwner {
  readonly id: string;
  readonly name: string;
  readonly logoUrl: string | null;
  readonly industry: string;
  readonly website: string | null;
  readonly socialLinks: readonly string[];
  readonly businessAddress: string;
  readonly entityType: BrandEntityType;
  readonly status: BrandStatus;
  readonly statusReason: string | null;
  readonly verificationDocs: readonly BrandVerificationDoc[];
  readonly contact: BrandContact;
  readonly createdAt: string;
}

/** DTO admin — kèm email tài khoản gốc. */
export interface BrandAdmin extends BrandOwner {
  readonly userEmail: string;
}

export interface BrandProfileInput {
  readonly name: string;
  readonly logoUrl: string | null;
  readonly industry: string;
  readonly website: string | null;
  readonly socialLinks: readonly string[];
  readonly businessAddress: string;
  readonly entityType: BrandEntityType;
  readonly contact: BrandContact;
}

export const BRAND_ENTITY_TYPE_LABELS: Record<BrandEntityType, string> = {
  individual: 'Cá nhân',
  household: 'Hộ kinh doanh',
  company: 'Doanh nghiệp',
};

export const BRAND_STATUS_LABELS: Record<BrandStatus, string> = {
  draft: 'Bản nháp',
  pending_review: 'Chờ duyệt',
  verified: 'Đã xác minh',
  rejected: 'Bị từ chối',
  suspended: 'Tạm khóa',
  info_required: 'Cần bổ sung',
};
