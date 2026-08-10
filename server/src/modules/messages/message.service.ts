import { ApiError } from '../../shared/errors/api-error.js';
import { logger } from '../../shared/logger/logger.js';
import type { AuditRepository } from '../audit/audit.repository.js';
import { assertBookingAccess, type BookingParticipant } from '../bookings/booking.access.js';
import type { BookingRepository } from '../bookings/booking.repository.js';
import type { Booking } from '../bookings/booking.types.js';
import type { NotificationService } from '../notifications/notification.service.js';
import type { MessageRepository } from './message.repository.js';
import type { Message, MessageDto, MessageSenderRole } from './message.types.js';

/** Cửa sổ cho phép xóa tin sau khi gửi (CHAT-006). */
const DELETE_WINDOW_MS = 15 * 60 * 1000;

/** Email và số điện thoại Việt Nam — dấu hiệu rủ nhau ra ngoài nền tảng. */
const EMAIL_PATTERN = /[\w.+-]+@[\w-]+\.[\w.]{2,}/;
const PHONE_PATTERN = /(?:\+?84|0)(?:[\s.-]?\d){8,10}/;

/** Trạng thái mà PII chưa được phép trao đổi (C-02, CHAT-004). */
const PRE_CONFIRM_STATUSES = new Set(['draft', 'pending_creator', 'awaiting_payment']);

const toDto = (message: Message): MessageDto => ({
  id: message.id,
  bookingId: message.bookingId,
  senderUserId: message.senderUserId,
  senderRole: message.senderRole,
  type: message.type,
  // Tin đã xóa: giữ bản ghi nhưng không trả nội dung cũ (CHAT-006).
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
}

export interface MessagePage {
  readonly items: readonly MessageDto[];
  readonly total: number;
  readonly page: number;
  readonly limit: number;
}

/**
 * Chat trong booking (CHAT-001..CHAT-006).
 * Mỗi booking một thread; chỉ hai bên tham gia và admin đọc được; admin
 * đọc thì bị audit. Nội dung nghi trao đổi ngoài nền tảng bị đánh dấu
 * chứ không chặn — chặn nhầm làm hỏng hội thoại hợp lệ.
 */
export class MessageService {
  private readonly messages: MessageRepository;
  private readonly bookings: BookingRepository;
  private readonly notifications: NotificationService;
  private readonly audit: AuditRepository;

  constructor(
    messages: MessageRepository,
    bookings: BookingRepository,
    notifications: NotificationService,
    audit: AuditRepository,
  ) {
    this.messages = messages;
    this.bookings = bookings;
    this.notifications = notifications;
    this.audit = audit;
  }

  async list(
    actor: BookingParticipant,
    bookingId: string,
    page: number,
    limit: number,
  ): Promise<MessagePage> {
    const booking = await this.requireBooking(bookingId, actor);

    // CHAT-005: admin xem thread của người khác thì phải để lại dấu vết.
    if (actor.role === 'admin') {
      await this.audit.create({
        actorId: actor.userId,
        action: 'chat.admin_access',
        targetType: 'booking',
        targetId: booking.id,
        before: null,
        after: null,
        reason: null,
      });
    }

    const { items, total } = await this.messages.listByBooking({ bookingId, page, limit });
    return { items: items.map(toDto), total, page, limit };
  }

  async send(
    actor: BookingParticipant,
    bookingId: string,
    input: SendMessageInput,
  ): Promise<MessageDto> {
    const booking = await this.requireBooking(bookingId, actor);
    if (actor.role === 'system') {
      throw ApiError.forbidden('Không gửi tin nhắn thay hệ thống.');
    }

    const offPlatformFlagged = this.detectOffPlatform(booking, input.body);
    if (offPlatformFlagged) {
      logger.warn(
        { bookingId, senderUserId: actor.userId },
        'Nghi trao đổi liên hệ ngoài nền tảng trước khi booking xác nhận (CHAT-004)',
      );
    }

    const created = await this.messages.create({
      bookingId,
      senderUserId: actor.userId,
      senderRole: actor.role as MessageSenderRole,
      type: input.fileUrl ? 'file' : 'text',
      body: input.body,
      fileUrl: input.fileUrl ?? null,
      fileName: input.fileName ?? null,
      offPlatformFlagged,
    });

    await this.notifyCounterparts(booking, actor.userId);
    return toDto(created);
  }

  async markRead(actor: BookingParticipant, bookingId: string): Promise<number> {
    await this.requireBooking(bookingId, actor);
    return this.messages.markRead(bookingId, actor.userId);
  }

  async unreadCount(actor: BookingParticipant, bookingId: string): Promise<number> {
    await this.requireBooking(bookingId, actor);
    return this.messages.countUnread(bookingId, actor.userId);
  }

  /** Thu hồi tin của chính mình trong cửa sổ cho phép (CHAT-006). */
  async remove(actor: BookingParticipant, messageId: string): Promise<MessageDto> {
    const message = await this.messages.findById(messageId);
    if (!message) {
      throw ApiError.notFound('Không tìm thấy tin nhắn này.');
    }
    await this.requireBooking(message.bookingId, actor);

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

  private async requireBooking(
    bookingId: string,
    actor: BookingParticipant,
  ): Promise<Booking> {
    const booking = await this.bookings.findById(bookingId);
    if (!booking) {
      throw ApiError.notFound('Không tìm thấy booking này.');
    }
    assertBookingAccess(booking, actor);
    return booking;
  }

  /** Chỉ cảnh báo TRƯỚC khi booking xác nhận — sau đó trao đổi liên hệ là hợp lệ. */
  private detectOffPlatform(booking: Booking, body: string): boolean {
    if (!PRE_CONFIRM_STATUSES.has(booking.status)) return false;
    return EMAIL_PATTERN.test(body) || PHONE_PATTERN.test(body);
  }

  /** Báo cho phía còn lại có tin mới (NTF-001). */
  private async notifyCounterparts(booking: Booking, senderUserId: string): Promise<void> {
    const recipients = [booking.brandUserId, booking.creatorUserId].filter(
      (userId): userId is string => userId !== null && userId !== senderUserId,
    );
    await this.notifications.notifyMany(recipients, {
      type: 'new_message',
      title: `Tin nhắn mới trong booking ${booking.code}`,
      body: 'Bạn có tin nhắn mới cần xem.',
      link: `/bookings/${booking.id}`,
    });
  }
}
