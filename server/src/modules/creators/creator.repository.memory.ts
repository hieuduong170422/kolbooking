import type { CreatorRepository } from './creator.repository.js';
import type {
  Creator,
  CreatorListFilter,
  CreatorListResult,
  CreatorSortOption,
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
  if (filter.minPriceVnd !== undefined && creator.priceFromVnd < filter.minPriceVnd) return false;
  if (filter.maxPriceVnd !== undefined && creator.priceFromVnd > filter.maxPriceVnd) return false;
  return true;
};

const sortComparators: Record<CreatorSortOption, (a: Creator, b: Creator) => number> = {
  rating: (a, b) => b.rating - a.rating,
  price_asc: (a, b) => a.priceFromVnd - b.priceFromVnd,
  price_desc: (a, b) => b.priceFromVnd - a.priceFromVnd,
  newest: (a, b) => b.createdAt.localeCompare(a.createdAt),
};

/**
 * In-memory implementation cho giai đoạn base/dev.
 * Mọi thao tác trả về bản sao mới — không mutate dữ liệu nguồn.
 */
export class InMemoryCreatorRepository implements CreatorRepository {
  private readonly creators: readonly Creator[];

  constructor(creators: readonly Creator[]) {
    this.creators = creators;
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
    return Promise.resolve(found ?? null);
  }
}
