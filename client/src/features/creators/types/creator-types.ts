export const CREATOR_TYPES = ['influencer', 'koc', 'ugc'] as const;
export type CreatorType = (typeof CREATOR_TYPES)[number];

export const SOCIAL_PLATFORMS = ['tiktok', 'instagram', 'youtube', 'facebook'] as const;
export type SocialPlatform = (typeof SOCIAL_PLATFORMS)[number];

export const CREATOR_SORT_OPTIONS = ['rating', 'price_asc', 'price_desc', 'newest'] as const;
export type CreatorSortOption = (typeof CREATOR_SORT_OPTIONS)[number];

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

/** Mirror của CreatorPublicDto phía server — chỉ dữ liệu công khai (CRE-009). */
export interface Creator {
  readonly id: string;
  readonly displayName: string;
  readonly avatarUrl: string | null;
  readonly bio: string;
  readonly city: string;
  readonly niches: readonly string[];
  readonly language: CreatorLanguage;
  readonly creatorType: CreatorType;
  readonly socialAccounts: readonly SocialAccount[];
  readonly audienceMetrics: AudienceMetrics | null;
  readonly serviceMode: ServiceMode;
  readonly portfolioItems: readonly PortfolioItem[];
  readonly priceFromVnd: number;
  readonly rating: number;
  readonly completedBookings: number;
}

export interface CreatorListFilter {
  readonly search?: string;
  readonly city?: string;
  readonly creatorType?: CreatorType;
  readonly platform?: SocialPlatform;
  readonly sort?: CreatorSortOption;
  readonly page?: number;
  readonly limit?: number;
}

/** Mirror của CreatorOwnerDto — creator xem/chỉnh hồ sơ của mình (CRE-001..010). */
export interface CreatorOwner {
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

/** Mirror của CreatorAdminDto — bổ sung email user gốc (CRE-008). */
export interface CreatorAdmin extends CreatorOwner {
  readonly userEmail: string;
}

/** Input cho PUT /creators/me — full replace hồ sơ (CRE-001..006). */
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

export const CREATOR_TYPE_LABELS: Record<CreatorType, string> = {
  influencer: 'Influencer',
  koc: 'KOC',
  ugc: 'UGC Creator',
};

export const SORT_LABELS: Record<CreatorSortOption, string> = {
  rating: 'Đánh giá cao nhất',
  price_asc: 'Giá thấp đến cao',
  price_desc: 'Giá cao đến thấp',
  newest: 'Mới tham gia',
};

export const CREATOR_STATUS_LABELS: Record<CreatorStatus, string> = {
  draft: 'Bản nháp',
  pending_review: 'Chờ duyệt',
  info_required: 'Chờ bổ sung thông tin',
  verified: 'Đã duyệt',
  rejected: 'Bị từ chối',
  suspended: 'Tạm khóa',
};

export const SERVICE_MODE_LABELS: Record<ServiceMode, string> = {
  online: 'Online',
  offline: 'Offline',
  both: 'Online & Offline',
};

export const CREATOR_DAY_OF_WEEK_LABELS: Record<CreatorDayOfWeek, string> = {
  mon: 'Thứ 2',
  tue: 'Thứ 3',
  wed: 'Thứ 4',
  thu: 'Thứ 5',
  fri: 'Thứ 6',
  sat: 'Thứ 7',
  sun: 'Chủ nhật',
};
