/** Creator được brand lưu lại (BRD-006) — khóa theo cặp (userId, creatorId). */
export interface Favorite {
  readonly userId: string;
  readonly creatorId: string;
  readonly createdAt: string;
}

export interface FavoriteRepository {
  /** Thêm vào danh sách đã lưu; gọi lại với cặp trùng là no-op (idempotent). */
  add(userId: string, creatorId: string): Promise<void>;
  remove(userId: string, creatorId: string): Promise<void>;
  /** ID creator đã lưu, mới lưu trước. */
  listCreatorIds(userId: string): Promise<readonly string[]>;
  has(userId: string, creatorId: string): Promise<boolean>;
}
