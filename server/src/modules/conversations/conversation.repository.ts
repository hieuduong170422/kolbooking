import type { Conversation, CreateConversationInput } from './conversation.types.js';

export interface ConversationRepository {
  /** Tìm theo cặp brand-creator — khóa duy nhất của một luồng. */
  findByPair(brandUserId: string, creatorId: string): Promise<Conversation | null>;
  findById(id: string): Promise<Conversation | null>;
  create(input: CreateConversationInput): Promise<Conversation>;
  /** Cập nhật mốc tin nhắn cuối để sắp xếp danh sách. */
  touch(id: string, at: string): Promise<void>;
  /** Luồng của một brand (theo userId). */
  listByBrand(brandUserId: string): Promise<readonly Conversation[]>;
  /** Luồng của một creator (theo creatorId hồ sơ). */
  listByCreator(creatorId: string): Promise<readonly Conversation[]>;
}
