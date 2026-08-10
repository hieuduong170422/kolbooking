import { ApiError } from '../../shared/errors/api-error.js';
import { logger } from '../../shared/logger/logger.js';
import type { AuditRepository } from '../audit/audit.repository.js';
import type { BookingRepository } from '../bookings/booking.repository.js';
import type { ChatActor, ConversationService } from '../conversations/conversation.service.js';
import type { Conversation } from '../conversations/conversation.types.js';
import type { NotificationService } from '../notifications/notification.service.js';
import type { MessageRepository } from './message.repository.js';
import type { Message, MessageDto, MessageSenderRole } from './message.types.js';

/** Cửa sổ cho phép thu hồi tin sau khi gửi (CHAT-006). */
const DELETE_WINDOW_MS = 15 * 60 * 1000;

/** Email và số điện thoại Việt Nam — dấu hiệu rủ nhau ra ngoài nền tảng. */
const EMAIL_PATTERN = /[\w.+-]+@[\w-]+\.[\w.]{2,}/;
const PHONE_PATTERN = /(?:\+?84|0)(?:[\s.-]?\d){8,10}/;

/** Trạng thái booking mà PII chưa được phép trao đổi (C-02, CHAT-004). */
const PRE_CONFIRM_STATUSES = new Set(['draft', 'pending_creator', 'awaiting_payment']);

const toDto = (message: Message): MessageDto => ({
  id: message.id,
  conversationId: message.conversationId,
  bookingId: message.bookingId,
  senderUserId: message.senderUserId,
  senderRole: message.senderRole,
  type: message.type,
  // Tin đã thu hồi: giữ bản ghi nhưng không trả nội dung cũ (CHAT-006).
  body: message.deletedAt === null ? message.body : 'Tin nhắn đã được thu hồi',
  fileUrl: message.deletedAt === null ? message.fileUrl : null,
  fileName: message.deletedAt === null ? message.fileName : null,
  readByUserIds: message.readByUserIds,
  offPlatformFlagged: message.offPlatformFlagged,
  isDeleted: message.deletedAt !== null,
  createdAt: message.createdAt,
});

export interface SendMessageInput {
  readonly body: string;
  readonly fileUrl?: string | null | undefined;
  readonly fileName?: string | null | undefined;
  /** Gắn nhãn booking khi gửi từ màn booking. */
  readonly bookingId?: string | null | undefined;
}

export interface MessagePage {
  readonly items: readonly MessageDto[];
  readonly total: number;
  readonly page: number;
  readonly limit: number;
}

/**
 * Tin nhắn trong một luồng brand ↔ creator (CHAT-001..CHAT-006).
 *
 * Luồng tồn tại độc lập với booking nên brand hỏi được trước khi đặt
 * (OD-09). Đổi lại, rủi ro rủ nhau ra ngoài nền tảng cao nhất chính ở
 * giai đoạn này — nên cảnh báo bật mặc định khi chưa có booking xác nhận.
 */
export class MessageService {
  private readonly messages: MessageRepository;
  private readonly conversations: ConversationService;
  private readonly bookings: BookingRepository;
  private readonly notifications: NotificationService;
  private readonly audit: AuditRepository;

  constructor(
    messages: MessageRepository,
    conversations: ConversationService,
    bookings: BookingRepository,
    notifications: NotificationService,
    audit: AuditRepository,
  ) {
    this.messages = messages;
    this.conversations = conversations;
    this.bookings = bookings;
    this.notifications = notifications;
    this.audit = audit;
  }

  async list(
    actor: ChatActor,
    conversationId: string,
    page: number,
    limit: number,
  ): Promise<MessagePage> {
    const conversation = await this.conversations.requireAccess(actor, conversationId);

    // CHAT-005: admin xem thread của người khác thì phải để lại dấu vết.
    if (actor.role === 'admin') {
      await this.audit.create({
        actorId: actor.userId,
        action: 'chat.admin_access',
        targetType: 'conversation',
        targetId: conversation.id,
        before: null,
        after: null,
        reason: null,
      });
    }

    const { items, total } = await this.messages.listByConversation({
      conversationId,
      page,
      limit,
    });
    return { items: items.map(toDto), total, page, limit };
  }

  async send(
    actor: ChatActor,
    conversationId: string,
    input: SendMessageInput,
  ): Promise<MessageDto> {
    const conversation = await this.conversations.requireAccess(actor, conversationId);

    const offPlatformFlagged = await this.detectOffPlatform(input);
    if (offPlatformFlagged) {
      logger.warn(
        { conversationId, senderUserId: actor.userId },
        'Nghi trao đổi liên hệ ngoài nền tảng khi chưa có booking xác nhận (CHAT-004)',
      );
    }

    const created = await this.messages.create({
      conversationId,
      bookingId: input.bookingId ?? null,
      senderUserId: actor.userId,
      senderRole: actor.role as MessageSenderRole,
      type: input.fileUrl ? 'file' : 'text',
      body: input.body,
      fileUrl: input.fileUrl ?? null,
      fileName: input.fileName ?? null,
      offPlatformFlagged,
    });

    await this.conversations.touch(conversationId, created.createdAt);
    await this.notifyCounterpart(conversation, actor.userId);
    return toDto(created);
  }

  async markRead(actor: ChatActor, conversationId: string): Promise<number> {
    await this.conversations.requireAccess(actor, conversationId);
    return this.messages.markRead(conversationId, actor.userId);
  }

  /** Thu hồi tin của chính mình trong cửa sổ cho phép (CHAT-006). */
  async remove(actor: ChatActor, messageId: string): Promise<MessageDto> {
    const message = await this.messages.findById(messageId);
    if (!message) {
      throw ApiError.notFound('Không tìm thấy tin nhắn này.');
    }
    await this.conversations.requireAccess(actor, message.conversationId);

    if (message.senderUserId !== actor.userId) {
      throw ApiError.forbidden('Chỉ người gửi mới thu hồi được tin nhắn.');
    }
    if (message.deletedAt !== null) {
      throw ApiError.conflict('Tin nhắn đã được thu hồi.');
    }
    if (Date.now() - Date.parse(message.createdAt) > DELETE_WINDOW_MS) {
      throw ApiError.conflict('Đã quá thời gian cho phép thu hồi tin nhắn.');
    }

    const deleted = await this.messages.softDelete(messageId);
    if (!deleted) {
      throw ApiError.internal('Không thu hồi được tin nhắn.');
    }
    return toDto(deleted);
  }

  /**
   * Cảnh báo khi chưa có ràng buộc thanh toán: chat trước booking luôn cảnh
   * báo; trong booking thì chỉ cảnh báo tới khi booking được xác nhận.
   */
  private async detectOffPlatform(input: SendMessageInput): Promise<boolean> {
    const looksLikeContact =
      EMAIL_PATTERN.test(input.body) || PHONE_PATTERN.test(input.body);
    if (!looksLikeContact) return false;

    if (input.bookingId === undefined || input.bookingId === null) return true;

    const booking = await this.bookings.findById(input.bookingId);
    return booking === null || PRE_CONFIRM_STATUSES.has(booking.status);
  }

  /** Báo cho phía còn lại có tin mới (NTF-001). */
  private async notifyCounterpart(
    conversation: Conversation,
    senderUserId: string,
  ): Promise<void> {
    const recipients = [conversation.brandUserId, conversation.creatorUserId].filter(
      (userId): userId is string => userId !== null && userId !== senderUserId,
    );
    await this.notifications.notifyMany(recipients, {
      type: 'new_message',
      title: 'Bạn có tin nhắn mới',
      body: 'Mở cuộc trò chuyện để xem nội dung.',
      link: `/messages?c=${conversation.id}`,
    });
  }
}
