import { randomUUID } from 'node:crypto';
import type { MessageRepository } from './message.repository.js';
import type {
  CreateMessageInput,
  Message,
  MessageListFilter,
  MessageListResult,
} from './message.types.js';

/** In-memory implementation — bản ghi immutable, cập nhật bằng bản sao mới. */
export class InMemoryMessageRepository implements MessageRepository {
  private readonly messagesById = new Map<string, Message>();

  create(input: CreateMessageInput): Promise<Message> {
    const message: Message = {
      id: `msg_${randomUUID().replaceAll('-', '')}`,
      bookingId: input.bookingId,
      senderUserId: input.senderUserId,
      senderRole: input.senderRole,
      type: input.type,
      body: input.body,
      fileUrl: input.fileUrl,
      fileName: input.fileName,
      // Người gửi mặc nhiên đã đọc tin của chính mình.
      readByUserIds: [input.senderUserId],
      offPlatformFlagged: input.offPlatformFlagged,
      deletedAt: null,
      createdAt: new Date().toISOString(),
    };
    this.messagesById.set(message.id, message);
    return Promise.resolve(message);
  }

  findById(id: string): Promise<Message | null> {
    return Promise.resolve(this.messagesById.get(id) ?? null);
  }

  listByBooking(filter: MessageListFilter): Promise<MessageListResult> {
    const matched = this.ofBooking(filter.bookingId).sort((a, b) =>
      a.createdAt.localeCompare(b.createdAt),
    );
    const start = (filter.page - 1) * filter.limit;
    return Promise.resolve({
      items: matched.slice(start, start + filter.limit),
      total: matched.length,
    });
  }

  markRead(bookingId: string, userId: string): Promise<number> {
    let updated = 0;
    for (const message of this.ofBooking(bookingId)) {
      if (!message.readByUserIds.includes(userId)) {
        this.messagesById.set(message.id, {
          ...message,
          readByUserIds: [...message.readByUserIds, userId],
        });
        updated += 1;
      }
    }
    return Promise.resolve(updated);
  }

  softDelete(id: string): Promise<Message | null> {
    const existing = this.messagesById.get(id);
    if (!existing) {
      return Promise.resolve(null);
    }
    const deleted: Message = { ...existing, deletedAt: new Date().toISOString() };
    this.messagesById.set(id, deleted);
    return Promise.resolve(deleted);
  }

  countUnread(bookingId: string, userId: string): Promise<number> {
    const count = this.ofBooking(bookingId).filter(
      (message) => !message.readByUserIds.includes(userId),
    ).length;
    return Promise.resolve(count);
  }

  private ofBooking(bookingId: string): Message[] {
    return [...this.messagesById.values()].filter((message) => message.bookingId === bookingId);
  }
}
