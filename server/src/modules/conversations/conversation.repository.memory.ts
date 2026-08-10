import { randomUUID } from 'node:crypto';
import type { ConversationRepository } from './conversation.repository.js';
import type { Conversation, CreateConversationInput } from './conversation.types.js';

/** In-memory implementation — bản ghi immutable, luôn trả bản copy. */
export class InMemoryConversationRepository implements ConversationRepository {
  private readonly byId = new Map<string, Conversation>();

  findByPair(brandUserId: string, creatorId: string): Promise<Conversation | null> {
    const found = [...this.byId.values()].find(
      (item) => item.brandUserId === brandUserId && item.creatorId === creatorId,
    );
    return Promise.resolve(found ?? null);
  }

  findById(id: string): Promise<Conversation | null> {
    return Promise.resolve(this.byId.get(id) ?? null);
  }

  create(input: CreateConversationInput): Promise<Conversation> {
    const conversation: Conversation = {
      id: `cnv_${randomUUID().replaceAll('-', '')}`,
      brandUserId: input.brandUserId,
      creatorId: input.creatorId,
      creatorUserId: input.creatorUserId,
      createdAt: new Date().toISOString(),
      lastMessageAt: null,
    };
    this.byId.set(conversation.id, conversation);
    return Promise.resolve(conversation);
  }

  touch(id: string, at: string): Promise<void> {
    const existing = this.byId.get(id);
    if (existing) {
      this.byId.set(id, { ...existing, lastMessageAt: at });
    }
    return Promise.resolve();
  }

  listByBrand(brandUserId: string): Promise<readonly Conversation[]> {
    return Promise.resolve(this.sorted((item) => item.brandUserId === brandUserId));
  }

  listByCreator(creatorId: string): Promise<readonly Conversation[]> {
    return Promise.resolve(this.sorted((item) => item.creatorId === creatorId));
  }

  /** Luồng có tin mới nhất lên đầu; luồng chưa có tin xếp theo ngày tạo. */
  private sorted(predicate: (item: Conversation) => boolean): Conversation[] {
    return [...this.byId.values()]
      .filter(predicate)
      .sort((a, b) =>
        (b.lastMessageAt ?? b.createdAt).localeCompare(a.lastMessageAt ?? a.createdAt),
      );
  }
}
