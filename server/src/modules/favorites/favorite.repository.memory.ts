import type { Favorite, FavoriteRepository } from './favorite.repository.js';

const keyOf = (userId: string, creatorId: string): string => `${userId}::${creatorId}`;

/** In-memory implementation — Map theo khóa cặp để add/remove là O(1). */
export class InMemoryFavoriteRepository implements FavoriteRepository {
  private readonly favorites = new Map<string, Favorite>();

  constructor(seed: readonly Favorite[] = []) {
    for (const favorite of seed) {
      this.favorites.set(keyOf(favorite.userId, favorite.creatorId), favorite);
    }
  }

  add(userId: string, creatorId: string): Promise<void> {
    const key = keyOf(userId, creatorId);
    if (!this.favorites.has(key)) {
      this.favorites.set(key, { userId, creatorId, createdAt: new Date().toISOString() });
    }
    return Promise.resolve();
  }

  remove(userId: string, creatorId: string): Promise<void> {
    this.favorites.delete(keyOf(userId, creatorId));
    return Promise.resolve();
  }

  listCreatorIds(userId: string): Promise<readonly string[]> {
    const ids = [...this.favorites.values()]
      .filter((favorite) => favorite.userId === userId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map((favorite) => favorite.creatorId);
    return Promise.resolve(ids);
  }

  has(userId: string, creatorId: string): Promise<boolean> {
    return Promise.resolve(this.favorites.has(keyOf(userId, creatorId)));
  }
}
