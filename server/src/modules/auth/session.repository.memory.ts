import type { RefreshSession, SessionRepository } from './session.repository.js';

export class InMemorySessionRepository implements SessionRepository {
  private readonly sessionsByHash = new Map<string, RefreshSession>();

  create(session: RefreshSession): Promise<void> {
    this.sessionsByHash.set(session.tokenHash, session);
    return Promise.resolve();
  }

  findByTokenHash(tokenHash: string): Promise<RefreshSession | null> {
    return Promise.resolve(this.sessionsByHash.get(tokenHash) ?? null);
  }

  revoke(tokenHash: string): Promise<void> {
    const session = this.sessionsByHash.get(tokenHash);
    if (session && session.revokedAt === null) {
      this.sessionsByHash.set(tokenHash, { ...session, revokedAt: new Date().toISOString() });
    }
    return Promise.resolve();
  }

  revokeAllForUser(userId: string): Promise<void> {
    const now = new Date().toISOString();
    for (const [hash, session] of this.sessionsByHash) {
      if (session.userId === userId && session.revokedAt === null) {
        this.sessionsByHash.set(hash, { ...session, revokedAt: now });
      }
    }
    return Promise.resolve();
  }
}
