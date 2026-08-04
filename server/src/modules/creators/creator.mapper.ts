import type { Creator, CreatorOwnerDto, CreatorPublicDto } from './creator.types.js';

/** Chuyển domain entity → public DTO: loại bỏ mọi trường không công khai (CRE-009). */
export const toCreatorPublicDto = (creator: Creator): CreatorPublicDto => ({
  id: creator.id,
  displayName: creator.displayName,
  bio: creator.bio,
  city: creator.city,
  niches: creator.niches,
  creatorType: creator.creatorType,
  socialAccounts: creator.socialAccounts,
  priceFromVnd: creator.priceFromVnd,
  rating: creator.rating,
  completedBookings: creator.completedBookings,
});

/** DTO cho chính chủ — bỏ userId/userEmail để không lộ liên kết tài khoản (CRE-009). */
export const toCreatorOwnerDto = (creator: Creator): CreatorOwnerDto => ({
  id: creator.id,
  displayName: creator.displayName,
  avatarUrl: creator.avatarUrl,
  bio: creator.bio,
  city: creator.city,
  niches: creator.niches,
  language: creator.language,
  creatorType: creator.creatorType,
  socialAccounts: creator.socialAccounts,
  status: creator.status,
  statusReason: creator.statusReason,
  audienceMetrics: creator.audienceMetrics,
  serviceMode: creator.serviceMode,
  availability: creator.availability,
  portfolioItems: creator.portfolioItems,
  priceFromVnd: creator.priceFromVnd,
  rating: creator.rating,
  completedBookings: creator.completedBookings,
  createdAt: creator.createdAt,
});
