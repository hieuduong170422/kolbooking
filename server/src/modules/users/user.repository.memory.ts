import { randomUUID } from 'node:crypto';
import type { UserRepository } from './user.repository.js';
import type {
  CreateUserInput,
  User,
  UserListFilter,
  UserListResult,
  UserPatch,
} from './user.types.js';

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

  findAll(filter: UserListFilter): Promise<UserListResult> {
    const keyword = filter.search?.trim().toLowerCase();
    const matched = [...this.usersById.values()]
      .filter((user) => {
        if (filter.role && user.role !== filter.role) return false;
        if (filter.status && user.status !== filter.status) return false;
        if (keyword) {
          const haystack = `${user.email} ${user.displayName}`.toLowerCase();
          if (!haystack.includes(keyword)) return false;
        }
        return true;
      })
      // Mới nhất lên đầu — admin quan tâm tài khoản vừa đăng ký.
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

    const start = (filter.page - 1) * filter.limit;
    return Promise.resolve({
      items: matched.slice(start, start + filter.limit),
      total: matched.length,
    });
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
