import { randomUUID } from 'node:crypto';
import type { UserRepository } from './user.repository.js';
import type { CreateUserInput, User, UserPatch } from './user.types.js';

/**
 * In-memory implementation — lưu theo Map nhưng luôn trả bản ghi immutable.
 * Email so sánh không phân biệt hoa thường.
 */
export class InMemoryUserRepository implements UserRepository {
  private readonly usersById = new Map<string, User>();

  constructor(seedUsers: readonly User[] = []) {
    for (const user of seedUsers) {
      this.usersById.set(user.id, user);
    }
  }

  findById(id: string): Promise<User | null> {
    return Promise.resolve(this.usersById.get(id) ?? null);
  }

  findByEmail(email: string): Promise<User | null> {
    const normalized = email.toLowerCase();
    const found = [...this.usersById.values()].find(
      (user) => user.email.toLowerCase() === normalized,
    );
    return Promise.resolve(found ?? null);
  }

  create(input: CreateUserInput): Promise<User> {
    const user: User = {
      id: `usr_${randomUUID()}`,
      email: input.email.toLowerCase(),
      passwordHash: input.passwordHash,
      displayName: input.displayName,
      role: input.role,
      status: 'active',
      emailVerifiedAt: null,
      consent: input.consent,
      createdAt: new Date().toISOString(),
    };
    this.usersById.set(user.id, user);
    return Promise.resolve(user);
  }

  update(id: string, patch: UserPatch): Promise<User | null> {
    const existing = this.usersById.get(id);
    if (!existing) {
      return Promise.resolve(null);
    }
    const updated: User = { ...existing, ...patch };
    this.usersById.set(id, updated);
    return Promise.resolve(updated);
  }
}
