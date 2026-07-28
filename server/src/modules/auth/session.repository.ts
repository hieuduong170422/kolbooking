/** Một refresh session — token chỉ lưu dạng hash (SEC-009). */
export interface RefreshSession {
  readonly tokenHash: string;
  readonly userId: string;
  readonly expiresAt: string;
  readonly revokedAt: string | null;
}

export interface SessionRepository {
  create(session: RefreshSession): Promise<void>;
  findByTokenHash(tokenHash: string): Promise<RefreshSession | null>;
  revoke(tokenHash: string): Promise<void>;
  /** Thu hồi toàn bộ session của một user (AUTH-006: khóa tài khoản). */
  revokeAllForUser(userId: string): Promise<void>;
}
