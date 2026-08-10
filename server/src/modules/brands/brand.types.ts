/** Loại chủ thể kinh doanh (BRD-002) — dùng cho xác minh và chứng từ. */
export const BRAND_ENTITY_TYPES = ['individual', 'household', 'company'] as const;
export type BrandEntityType = (typeof BRAND_ENTITY_TYPES)[number];

/** Trạng thái hồ sơ brand (BRD-004) — mirror transition matrix của creator. */
export const BRAND_STATUSES = [
  'draft',
  'pending_review',
  'verified',
  'rejected',
  'suspended',
  'info_required',
] as const;
export type BrandStatus = (typeof BRAND_STATUSES)[number];

/** Tài liệu xác minh do brand upload — file private, chỉ admin xem (BRD-003). */
export interface BrandVerificationDoc {
  readonly id: string;
  readonly fileName: string;
  /** Key trong FileStorage (private) — KHÔNG phải URL công khai. */
  readonly storageKey: string;
  readonly uploadedAt: string;
}

/** Người liên hệ booking — không bao giờ công khai (BRD-005, BR-011). */
export interface BrandContact {
  readonly name: string;
  readonly email: string;
  readonly phone: string;
}

/** Domain entity — hồ sơ brand (BRD-001..BRD-005). */
export interface Brand {
  readonly id: string;
  readonly userId: string;
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

/** DTO chính chủ — brand xem/chỉnh hồ sơ của mình. */
export interface BrandOwnerDto {
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

/** DTO cho admin duyệt — bổ sung email user gốc (BRD-007). */
export interface BrandAdminDto extends BrandOwnerDto {
  readonly userEmail: string;
}

/** Input PUT /brands/me — full replace hồ sơ (BRD-001, BRD-002, BRD-005). */
export interface BrandProfileInput {
  readonly name: string;
  readonly logoUrl?: string | null | undefined;
  readonly industry: string;
  readonly website?: string | null | undefined;
  readonly socialLinks: readonly string[];
  readonly businessAddress: string;
  readonly entityType: BrandEntityType;
  readonly contact: BrandContact;
}
