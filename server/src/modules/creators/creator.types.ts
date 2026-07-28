export const CREATOR_TYPES = ['influencer', 'koc', 'ugc'] as const;
export type CreatorType = (typeof CREATOR_TYPES)[number];

export const SOCIAL_PLATFORMS = ['tiktok', 'instagram', 'youtube', 'facebook'] as const;
export type SocialPlatform = (typeof SOCIAL_PLATFORMS)[number];

export const CREATOR_STATUSES = ['draft', 'pending_review', 'verified', 'rejected', 'suspended'] as const;
export type CreatorStatus = (typeof CREATOR_STATUSES)[number];

export interface SocialAccount {
  readonly platform: SocialPlatform;
  readonly handle: string;
  readonly url: string;
  readonly followerCount: number;
  readonly isVerified: boolean;
}

/** Domain entity — internal representation, may contain non-public fields. */
export interface Creator {
  readonly id: string;
  readonly displayName: string;
  readonly bio: string;
  readonly city: string;
  readonly niches: readonly string[];
  readonly creatorType: CreatorType;
  readonly status: CreatorStatus;
  readonly socialAccounts: readonly SocialAccount[];
  /** Giá khởi điểm của package rẻ nhất, đơn vị VND. */
  readonly priceFromVnd: number;
  readonly rating: number;
  readonly completedBookings: number;
  readonly createdAt: string;
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
