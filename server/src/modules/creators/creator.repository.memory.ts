import { randomUUID } from 'node:crypto';
import type { CreatorRepository } from './creator.repository.js';
import type {
  Creator,
  CreatorListFilter,
  CreatorListResult,
  CreatorSortOption,
  CreatorStatus,
  PortfolioItem,
} from './creator.types.js';

const matchesSearch = (creator: Creator, search: string): boolean => {
  const keyword = search.toLowerCase();
  return (
    creator.displayName.toLowerCase().includes(keyword) ||
    creator.bio.toLowerCase().includes(keyword) ||
    creator.niches.some((niche) => niche.toLowerCase().includes(keyword))
  );
};

const matchesFilter = (creator: Creator, filter: CreatorListFilter): boolean => {
  if (creator.status !== 'verified') return false;
  if (filter.search && !matchesSearch(creator, filter.search)) return false;
  if (filter.city && creator.city.toLowerCase() !== filter.city.toLowerCase()) return false;
  if (filter.creatorType && creator.creatorType !== filter.creatorType) return false;
  if (
    filter.platform &&
    !creator.socialAccounts.some((account) => account.platform === filter.platform)
  ) {
    return false;
  }
  // serviceMode: 'online' khớp creator online hoặc both; 'offline' tương tự; 'both' khớp cả hai nơi (CRE-006).
  if (
    filter.serviceMode &&
    creator.serviceMode !== filter.serviceMode &&
    creator.serviceMode !== 'both'
  ) {
    return false;
  }
  if (filter.minPriceVnd !== undefined && creator.priceFromVnd < filter.minPriceVnd) return false;
  if (filter.maxPriceVnd !== undefined && creator.priceFromVnd > filter.maxPriceVnd) return false;
  if (filter.minRating !== undefined && creator.rating < filter.minRating) return false;
  return true;
};

const sortComparators: Record<CreatorSortOption, (a: Creator, b: Creator) => number> = {
  rating: (a, b) => b.rating - a.rating,
  price_asc: (a, b) => a.priceFromVnd - b.priceFromVnd,
  price_desc: (a, b) => b.priceFromVnd - a.priceFromVnd,
  newest: (a, b) => b.createdAt.localeCompare(a.createdAt),
  completed: (a, b) => b.completedBookings - a.completedBookings,
};

/**
 * In-memory implementation cho giai đoạn base/dev.
 * Mọi thao tác trả về bản sao mới (structuredClone) — không mutate
 * mảng nguồn; write method reassign this.creators bằng mảng mới (immutability).
 */
export class InMemoryCreatorRepository implements CreatorRepository {
  private creators: readonly Creator[];

  constructor(creators: readonly Creator[]) {
    this.creators = [...creators];
  }

  findAll(filter: CreatorListFilter): Promise<CreatorListResult> {
    const filtered = this.creators.filter((creator) => matchesFilter(creator, filter));
    const sorted = [...filtered].sort(sortComparators[filter.sort]);
    const start = (filter.page - 1) * filter.limit;
    const items = sorted.slice(start, start + filter.limit);
    return Promise.resolve({ items, total: filtered.length });
  }

  findById(id: string): Promise<Creator | null> {
    const found = this.creators.find((creator) => creator.id === id);
    return Promise.resolve(found ? structuredClone(found) : null);
  }

  findByUserId(userId: string): Promise<Creator | null> {
    const found = this.creators.find((creator) => creator.userId === userId);
    return Promise.resolve(found ? structuredClone(found) : null);
  }

  create(input: Creator): Promise<Creator> {
    const created: Creator = {
      ...structuredClone(input),
      // Bỏ dấu gạch của UUID: route validate id creator theo /^crt_[a-zA-Z0-9]+$/,
      // id có dấu gạch sẽ bị chặn ở duyệt hồ sơ, mở chat và tạo booking.
      id: `crt_${randomUUID().replaceAll('-', '')}`,
    };
    this.creators = [...this.creators, created];
    return Promise.resolve(structuredClone(created));
  }

  update(id: string, input: Creator): Promise<Creator | null> {
    const found = this.creators.find((creator) => creator.id === id);
    if (!found) return Promise.resolve(null);
    const updated: Creator = { ...structuredClone(input), id };
    this.creators = this.creators.map((creator) => (creator.id === id ? updated : creator));
    return Promise.resolve(structuredClone(updated));
  }

  findByStatusForReview(statuses: readonly CreatorStatus[]): Promise<readonly Creator[]> {
    const matches = this.creators
      .filter((creator) => statuses.includes(creator.status))
      .map((creator) => structuredClone(creator));
    return Promise.resolve(matches);
  }

  findForReviewById(id: string): Promise<Creator | null> {
    const found = this.creators.find((creator) => creator.id === id);
    return Promise.resolve(found ? structuredClone(found) : null);
  }

  addPortfolioItem(creatorId: string, item: PortfolioItem): Promise<Creator | null> {
    const found = this.creators.find((creator) => creator.id === creatorId);
    if (!found) return Promise.resolve(null);
    const updated: Creator = {
      ...found,
      portfolioItems: [...found.portfolioItems, structuredClone(item)],
    };
    this.creators = this.creators.map((creator) => (creator.id === creatorId ? updated : creator));
    return Promise.resolve(structuredClone(updated));
  }

  removePortfolioItem(creatorId: string, itemId: string): Promise<Creator | null> {
    const found = this.creators.find((creator) => creator.id === creatorId);
    if (!found) return Promise.resolve(null);
    // Lựa chọn thiết kế: item không tồn tại → trả creator không đổi (idempotent), không throw.
    if (!found.portfolioItems.some((item) => item.id === itemId)) {
      return Promise.resolve(structuredClone(found));
    }
    const updated: Creator = {
      ...found,
      portfolioItems: found.portfolioItems.filter((item) => item.id !== itemId),
    };
    this.creators = this.creators.map((creator) => (creator.id === creatorId ? updated : creator));
    return Promise.resolve(structuredClone(updated));
  }
}
