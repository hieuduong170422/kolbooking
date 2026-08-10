import type {
  CreateMessageInput,
  Message,
  MessageListFilter,
  MessageListResult,
} from './message.types.js';

export interface MessageRepository {
  create(input: CreateMessageInput): Promise<Message>;
  findById(id: string): Promise<Message | null>;
  /** Tin trong một booking, cũ trước — đọc thread theo thứ tự thời gian. */
  listByBooking(filter: MessageListFilter): Promise<MessageListResult>;
  /** Đánh dấu đã đọc mọi tin trong booking cho một người (CHAT-003). */
  markRead(bookingId: string, userId: string): Promise<number>;
  /** Xóa mềm — giữ bản ghi (CHAT-006). */
  softDelete(id: string): Promise<Message | null>;
  /** Số tin chưa đọc của một người trong một booking. */
  countUnread(bookingId: string, userId: string): Promise<number>;
}
