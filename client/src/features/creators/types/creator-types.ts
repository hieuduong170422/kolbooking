export const CREATOR_TYPES = ['influencer', 'koc', 'ugc'] as const;
export type CreatorType = (typeof CREATOR_TYPES)[number];

export const SOCIAL_PLATFORMS = ['tiktok', 'instagram', 'youtube', 'facebook'] as const;
export type SocialPlatform = (typeof SOCIAL_PLATFORMS)[number];

export const CREATOR_SORT_OPTIONS = ['rating', 'price_asc', 'price_desc', 'newest'] as const;
export type CreatorSortOption = (typeof CREATOR_SORT_OPTIONS)[number];

export interface SocialAccount {
  readonly platform: SocialPlatform;
  readonly handle: string;
  readonly url: string;
  readonly followerCount: number;
  readonly isVerified: boolean;
}

/** Mirror của CreatorPublicDto phía server — chỉ dữ liệu công khai. */
export interface Creator {
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

export interface CreatorListFilter {
  readonly search?: string;
  readonly city?: string;
  readonly creatorType?: CreatorType;
  readonly platform?: SocialPlatform;
  readonly sort?: CreatorSortOption;
  readonly page?: number;
  readonly limit?: number;
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
