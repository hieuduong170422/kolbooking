import { apiDelete, apiGet, apiPost } from '../../../shared/api/http-client';
import type { ApiSuccessBody } from '../../../shared/api/api-types';

export const MESSAGE_SENDER_ROLES = ['brand', 'creator', 'admin'] as const;
export type MessageSenderRole = (typeof MESSAGE_SENDER_ROLES)[number];

/** Mirror MessageDto phía server (CHAT-001..006). */
export interface Message {
  readonly id: string;
  readonly conversationId: string;
  readonly bookingId: string | null;
  readonly senderUserId: string;
  readonly senderRole: MessageSenderRole;
  readonly type: 'text' | 'file';
  readonly body: string;
  readonly fileUrl: string | null;
  readonly fileName: string | null;
  readonly readByUserIds: readonly string[];
  readonly offPlatformFlagged: boolean;
  readonly isDeleted: boolean;
  readonly createdAt: string;
}

/** Mirror ConversationSummary — một luồng cho mỗi cặp brand ↔ creator (OD-09). */
export interface Conversation {
  readonly id: string;
  readonly brandUserId: string;
  readonly creatorId: string;
  readonly creatorUserId: string | null;
  readonly createdAt: string;
  readonly lastMessageAt: string | null;
  readonly creatorDisplayName: string;
  readonly creatorAvatarUrl: string | null;
  readonly brandDisplayName: string;
  readonly lastMessagePreview: string | null;
  readonly unreadCount: number;
}

export const fetchConversations = async (): Promise<readonly Conversation[]> => {
  const response = await apiGet<readonly Conversation[]>('/conversations');
  return response.data;
};

/** Mở luồng với creator — idempotent, gọi lại trả đúng luồng cũ. */
export const startConversation = async (creatorId: string): Promise<{ id: string }> => {
  const response = await apiPost<{ conversation: { id: string } }>('/conversations', {
    creatorId,
  });
  return response.data.conversation;
};

/** Luồng tương ứng một booking — để mở booking thấy luôn lịch sử hỏi trước đó. */
export const fetchConversationForBooking = async (
  bookingId: string,
): Promise<{ id: string }> => {
  const response = await apiGet<{ conversation: { id: string } }>(
    `/conversations/for-booking/${bookingId}`,
  );
  return response.data.conversation;
};

export const fetchMessages = (
  conversationId: string,
): Promise<ApiSuccessBody<readonly Message[]>> =>
  apiGet<readonly Message[]>(`/conversations/${conversationId}/messages`, {
    page: 1,
    limit: 100,
  });

export const sendMessage = async (
  conversationId: string,
  body: string,
  bookingId?: string,
): Promise<Message> => {
  const response = await apiPost<{ message: Message }>(
    `/conversations/${conversationId}/messages`,
    bookingId === undefined ? { body } : { body, bookingId },
  );
  return response.data.message;
};

export const markMessagesRead = async (conversationId: string): Promise<void> => {
  await apiPost(`/conversations/${conversationId}/messages/read`);
};

export const removeMessage = async (
  conversationId: string,
  messageId: string,
): Promise<void> => {
  await apiDelete(`/conversations/${conversationId}/messages/${messageId}`);
};
