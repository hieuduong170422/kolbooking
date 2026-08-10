import { apiDelete, apiGet, apiPost } from '../../../shared/api/http-client';
import type { ApiSuccessBody } from '../../../shared/api/api-types';

export const MESSAGE_SENDER_ROLES = ['brand', 'creator', 'admin'] as const;
export type MessageSenderRole = (typeof MESSAGE_SENDER_ROLES)[number];

/** Mirror MessageDto phía server (CHAT-001..006). */
export interface Message {
  readonly id: string;
  readonly bookingId: string;
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

export const fetchMessages = (
  bookingId: string,
): Promise<ApiSuccessBody<readonly Message[]>> =>
  apiGet<readonly Message[]>(`/bookings/${bookingId}/messages`, { page: 1, limit: 100 });

export const sendMessage = async (bookingId: string, body: string): Promise<Message> => {
  const response = await apiPost<{ message: Message }>(`/bookings/${bookingId}/messages`, {
    body,
  });
  return response.data.message;
};

export const markMessagesRead = async (bookingId: string): Promise<void> => {
  await apiPost(`/bookings/${bookingId}/messages/read`);
};

export const removeMessage = async (bookingId: string, messageId: string): Promise<void> => {
  await apiDelete(`/bookings/${bookingId}/messages/${messageId}`);
};
