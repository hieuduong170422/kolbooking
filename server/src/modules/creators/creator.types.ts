export const CREATOR_TYPES = ['influencer', 'koc', 'ugc'] as const;
export type CreatorType = (typeof CREATOR_TYPES)[number];

export const SOCIAL_PLATFORMS = ['tiktok', 'instagram', 'youtube', 'facebook'] as const;
export type SocialPlatform = (typeof SOCIAL_PLATFORMS)[number];

export const CREATOR_STATUSES = [
  'draft',
  'pending_review',
  'verified',
  'rejected',
  'suspended',
  'info_required',
] as const;
export type CreatorStatus = (typeof CREATOR_STATUSES)[number];

export const CREATOR_LANGUAGES = ['vi', 'en'] as const;
export type CreatorLanguage = (typeof CREATOR_LANGUAGES)[number];

export const SERVICE_MODES = ['online', 'offline', 'both'] as const;
export type ServiceMode = (typeof SERVICE_MODES)[number];

export const CREATOR_DAYS_OF_WEEK = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const;
export type CreatorDayOfWeek = (typeof CREATOR_DAYS_OF_WEEK)[number];

export const PORTFOLIO_ITEM_TYPES = ['image', 'video', 'link'] as const;
export type PortfolioItemType = (typeof PORTFOLIO_ITEM_TYPES)[number];

export interface SocialAccount {
  readonly platform: SocialPlatform;
  readonly handle: string;
  readonly url: string;
  readonly followerCount: number;
  readonly isVerified: boolean;
}

/** Audience metrics — hiện tại chỉ có dữ liệu tự khai báo (CRE-005). */
export interface AudienceMetrics {
  readonly followerCount: number;
  readonly viewCount: number;
  readonly updatedAt: string;
  readonly isSelfReported: true;
}

/** Một mục trong portfolio: ảnh/video/link kèm caption + category (CRE-004). */
export interface PortfolioItem {
  readonly id: string;
  readonly type: PortfolioItemType;
  readonly url: string;
  readonly caption: string | null;
  readonly category: string | null;
  readonly thumbnailUrl: string | null;
  readonly createdAt: string;
}

/** Lịch nhận việc của creator (CRE-010). */
export interface Availability {
  readonly availableDays: readonly CreatorDayOfWeek[];
  readonly isPaused: boolean;
}

/** Domain entity — internal representation, may contain non-public fields. */
export interface Creator {
  readonly id: string;
  /** Liên kết tới User (usr_*) — null khi chưa liên kết tài khoản (CRE-001). */
  readonly userId: string | null;
  readonly displayName: string;
  readonly avatarUrl: string | null;
  readonly bio: string;
  readonly city: string;
  readonly niches: readonly string[];
  readonly language: CreatorLanguage;
  readonly creatorType: CreatorType;
  readonly status: CreatorStatus;
  /** Lý do reject/suspend/yêu cầu bổ sung thông tin (CRE-007, CRE-008). */
  readonly statusReason: string | null;
  readonly socialAccounts: readonly SocialAccount[];
  readonly audienceMetrics: AudienceMetrics | null;
  readonly serviceMode: ServiceMode;
  readonly availability: Availability;
  readonly portfolioItems: readonly PortfolioItem[];
  /** Giá khởi điểm của package rẻ nhất, đơn vị VND. */
  readonly priceFromVnd: number;
  readonly rating: number;
  readonly completedBookings: number;
  readonly createdAt: string;
}

/** DTO cho chính chủ — creator xem/chỉnh hồ sơ của mình (CRE-001..CRE-010). */
export interface CreatorOwnerDto {
  readonly id: string;
  readonly displayName: string;
  readonly avatarUrl: string | null;
  readonly bio: string;
  readonly city: string;
  readonly niches: readonly string[];
  readonly language: CreatorLanguage;
  readonly creatorType: CreatorType;
  readonly socialAccounts: readonly SocialAccount[];
  readonly status: CreatorStatus;
  readonly statusReason: string | null;
  readonly audienceMetrics: AudienceMetrics | null;
  readonly serviceMode: ServiceMode;
  readonly availability: Availability;
  readonly portfolioItems: readonly PortfolioItem[];
  readonly priceFromVnd: number;
  readonly rating: number;
  readonly completedBookings: number;
  readonly createdAt: string;
}

/** DTO cho admin duyệt hồ sơ — bổ sung email user gốc (CRE-008). */
export interface CreatorAdminDto extends CreatorOwnerDto {
  readonly userEmail: string;
}

/** Input cho PUT /creators/me — full replace hồ sơ (CRE-001..CRE-006). */
export interface CreatorProfileInput {
  readonly displayName: string;
  readonly avatarUrl?: string | null;
  readonly bio: string;
  readonly city: string;
  readonly niches: readonly string[];
  readonly language: CreatorLanguage;
  readonly creatorType: CreatorType;
  readonly socialAccounts: readonly SocialAccount[];
  readonly audienceMetrics: AudienceMetrics | null;
  readonly serviceMode: ServiceMode;
}

/** Input cho PATCH /creators/me/availability (CRE-010). */
export interface AvailabilityUpdate {
  readonly availableDays: readonly CreatorDayOfWeek[];
  readonly isPaused: boolean;
}

/** Public DTO — chỉ chứa dữ liệu công khai, không PII (CRE-009). */
export interface CreatorPublicDto {
  readonly id: string;
  readonly displayName: string;
  readonly bio: string;
  readonly city: string;
  readonly niches: readonly string[];
  readonly creatorType: CreatorType;
  readonly socialAccounts: readonly SocialAccount[];
  readonly priceFromVnd: number;
  readonly rating: number;
  readonly completedBookings: number;
}

export const CREATOR_SORT_OPTIONS = ['rating', 'price_asc', 'price_desc', 'newest'] as const;
export type CreatorSortOption = (typeof CREATOR_SORT_OPTIONS)[number];

export interface CreatorListFilter {
  readonly search?: string;
  readonly city?: string;
  readonly creatorType?: CreatorType;
  readonly platform?: SocialPlatform;
  readonly minPriceVnd?: number;
  readonly maxPriceVnd?: number;
  readonly sort: CreatorSortOption;
  readonly page: number;
  readonly limit: number;
}

export interface CreatorListResult {
  readonly items: readonly Creator[];
  readonly total: number;
}
