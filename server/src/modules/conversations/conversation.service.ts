import { ApiError } from '../../shared/errors/api-error.js';
import type { CreatorRepository } from '../creators/creator.repository.js';
import type { UserRepository } from '../users/user.repository.js';
import type { MessageRepository } from '../messages/message.repository.js';
import type { ConversationRepository } from './conversation.repository.js';
import type { Conversation, ConversationSummary } from './conversation.types.js';

/** Danh tính người gọi khi thao tác trên luồng chat. */
export interface ChatActor {
  readonly userId: string;
  readonly role: 'brand' | 'creator' | 'admin';
  /** creatorId hồ sơ — chỉ có khi role = creator. */
  readonly creatorId?: string | undefined;
}

const PREVIEW_LENGTH = 80;

/**
 * Quản lý luồng chat brand ↔ creator (OD-09).
 *
 * Brand chủ động mở luồng để hỏi trước khi booking; creator chỉ trả lời
 * trong luồng đã có — tránh creator nhắn tin chào mời hàng loạt.
 */
export class ConversationService {
  private readonly conversations: ConversationRepository;
  private readonly creators: CreatorRepository;
  private readonly users: UserRepository;
  private readonly messages: MessageRepository;

  constructor(
    conversations: ConversationRepository,
    creators: CreatorRepository,
    users: UserRepository,
    messages: MessageRepository,
  ) {
    this.conversations = conversations;
    this.creators = creators;
    this.users = users;
    this.messages = messages;
  }

  /**
   * Lấy luồng của cặp brand-creator, tạo mới nếu chưa có (idempotent).
   * Dùng cho cả nút "Nhắn tin" ở trang creator lẫn chat trong booking.
   */
  async getOrCreateForPair(brandUserId: string, creatorId: string): Promise<Conversation> {
    const existing = await this.conversations.findByPair(brandUserId, creatorId);
    if (existing) return existing;

    const creator = await this.creators.findById(creatorId);
    if (!creator || creator.status !== 'verified') {
      throw ApiError.notFound('Không tìm thấy creator này.');
    }
    return this.conversations.create({
      brandUserId,
      creatorId,
      creatorUserId: creator.userId,
    });
  }

  /** Chỉ hai người trong luồng và admin đọc được (CHAT-001, SEC-003). */
  async requireAccess(actor: ChatActor, conversationId: string): Promise<Conversation> {
    const conversation = await this.conversations.findById(conversationId);
    if (!conversation) {
      throw ApiError.notFound('Không tìm thấy cuộc trò chuyện này.');
    }
    if (actor.role === 'admin') return conversation;

    const isBrand = conversation.brandUserId === actor.userId;
    const isCreator = actor.creatorId !== undefined && conversation.creatorId === actor.creatorId;
    if (!isBrand && !isCreator) {
      // 404 thay vì 403 — không tiết lộ luồng đó có tồn tại hay không.
      throw ApiError.notFound('Không tìm thấy cuộc trò chuyện này.');
    }
    return conversation;
  }

  /** Danh sách luồng của người đang đăng nhập, kèm tên hiển thị và số chưa đọc. */
  async listForActor(actor: ChatActor): Promise<readonly ConversationSummary[]> {
    const conversations =
      actor.role === 'creator'
        ? await this.conversations.listByCreator(actor.creatorId ?? '')
        : await this.conversations.listByBrand(actor.userId);

    return Promise.all(
      conversations.map(async (conversation) => {
        const [creator, brandUser, unreadCount, lastPage] = await Promise.all([
          this.creators.findForReviewById(conversation.creatorId),
          this.users.findById(conversation.brandUserId),
          this.messages.countUnread(conversation.id, actor.userId),
          this.messages.listByConversation({
            conversationId: conversation.id,
            page: 1,
            limit: 200,
          }),
        ]);

        const lastMessage = lastPage.items.at(-1);
        return {
          ...conversation,
          creatorDisplayName: creator?.displayName ?? 'Creator',
          creatorAvatarUrl: creator?.avatarUrl ?? null,
          brandDisplayName: brandUser?.displayName ?? 'Brand',
          lastMessagePreview:
            lastMessage === undefined
              ? null
              : lastMessage.deletedAt !== null
                ? 'Tin nhắn đã được thu hồi'
                : lastMessage.body.slice(0, PREVIEW_LENGTH),
          unreadCount,
        };
      }),
    );
  }

  touch(conversationId: string, at: string): Promise<void> {
    return this.conversations.touch(conversationId, at);
  }
}
