import type { Creator, CreatorPublicDto } from './creator.types.js';

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
