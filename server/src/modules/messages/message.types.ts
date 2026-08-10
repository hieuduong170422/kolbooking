export const MESSAGE_TYPES = ['text', 'file'] as const;
export type MessageType = (typeof MESSAGE_TYPES)[number];

export const MESSAGE_SENDER_ROLES = ['brand', 'creator', 'admin'] as const;
export type MessageSenderRole = (typeof MESSAGE_SENDER_ROLES)[number];

/** Một tin nhắn trong thread của booking (CHAT-001..CHAT-003). */
export interface Message {
  readonly id: string;
  readonly bookingId: string;
  readonly senderUserId: string;
  readonly senderRole: MessageSenderRole;
  readonly type: MessageType;
  /** Nội dung text, hoặc chú thích kèm file. */
  readonly body: string;
  readonly fileUrl: string | null;
  readonly fileName: string | null;
  /** userId đã đọc — read receipt cơ bản (CHAT-003). */
  readonly readByUserIds: readonly string[];
  /**
   * Nghi ngờ trao đổi ngoài nền tảng (CHAT-004). Không chặn gửi để khỏi
   * hỏng nội dung hợp lệ; chỉ đánh dấu và ghi log cho Operations.
   */
  readonly offPlatformFlagged: boolean;
  /** Xóa mềm — giữ bản ghi để phân xử (CHAT-006, BR-015). */
  readonly deletedAt: string | null;
  readonly createdAt: string;
}

export interface CreateMessageInput {
  readonly bookingId: string;
  readonly senderUserId: string;
  readonly senderRole: MessageSenderRole;
  readonly type: MessageType;
  readonly body: string;
  readonly fileUrl: string | null;
  readonly fileName: string | null;
  readonly offPlatformFlagged: boolean;
}

export interface MessageListFilter {
  readonly bookingId: string;
  readonly page: number;
  readonly limit: number;
}

export interface MessageListResult {
  readonly items: readonly Message[];
  readonly total: number;
}

/** DTO trả client — tin đã xóa chỉ còn dấu vết, không lộ nội dung cũ. */
export interface MessageDto {
  readonly id: string;
  readonly bookingId: string;
  readonly senderUserId: string;
  readonly senderRole: MessageSenderRole;
  readonly type: MessageType;
  readonly body: string;
  readonly fileUrl: string | null;
  readonly fileName: string | null;
  readonly readByUserIds: readonly string[];
  readonly offPlatformFlagged: boolean;
  readonly isDeleted: boolean;
  readonly createdAt: string;
}
