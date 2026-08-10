import { randomUUID } from 'node:crypto';
import type { VerificationTokenRepository } from './verification.repository.js';
import type {
  CreateVerificationTokenInput,
  VerificationPurpose,
  VerificationToken,
} from './verification.types.js';

/** In-memory implementation — bản ghi immutable, cập nhật bằng bản sao mới. */
export class InMemoryVerificationTokenRepository implements VerificationTokenRepository {
  private readonly tokensById = new Map<string, VerificationToken>();

  create(input: CreateVerificationTokenInput): Promise<VerificationToken> {
    const token: VerificationToken = {
      id: `vtk_${randomUUID()}`,
      userId: input.userId,
      purpose: input.purpose,
      codeHash: input.codeHash,
      expiresAt: input.expiresAt,
      consumedAt: null,
      attemptCount: 0,
      createdAt: new Date().toISOString(),
    };
    this.tokensById.set(token.id, token);
    return Promise.resolve(token);
  }

  findLatestActive(
    userId: string,
    purpose: VerificationPurpose,
  ): Promise<VerificationToken | null> {
    const candidates = [...this.tokensById.values()]
      .filter(
        (token) =>
          token.userId === userId && token.purpose === purpose && token.consumedAt === null,
      )
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return Promise.resolve(candidates[0] ?? null);
  }

  markConsumed(id: string): Promise<void> {
    const existing = this.tokensById.get(id);
    if (existing) {
      this.tokensById.set(id, { ...existing, consumedAt: new Date().toISOString() });
    }
    return Promise.resolve();
  }

  incrementAttempts(id: string): Promise<VerificationToken | null> {
    const existing = this.tokensById.get(id);
    if (!existing) {
      return Promise.resolve(null);
    }
    const updated: VerificationToken = { ...existing, attemptCount: existing.attemptCount + 1 };
    this.tokensById.set(id, updated);
    return Promise.resolve(updated);
  }

  invalidateAllFor(userId: string, purpose: VerificationPurpose): Promise<void> {
    const now = new Date().toISOString();
    for (const [id, token] of this.tokensById) {
      if (token.userId === userId && token.purpose === purpose && token.consumedAt === null) {
        this.tokensById.set(id, { ...token, consumedAt: now });
      }
    }
    return Promise.resolve();
  }
}
