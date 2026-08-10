import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  fetchConversationForBooking,
  fetchConversations,
  fetchMessages,
  markMessagesRead,
  removeMessage,
  sendMessage,
  startConversation,
} from '../api/messages-api';

/** Polling 8 giây — đủ cho MVP, nâng lên SSE khi có nhu cầu thật. */
const POLL_INTERVAL_MS = 8_000;

export const useConversations = () =>
  useQuery({
    queryKey: ['conversations'] as const,
    queryFn: fetchConversations,
    refetchInterval: POLL_INTERVAL_MS,
    retry: false,
  });

/** Luồng ứng với một booking — dùng ở màn booking detail. */
export const useConversationForBooking = (bookingId: string | undefined) =>
  useQuery({
    queryKey: ['conversations', 'for-booking', bookingId] as const,
    queryFn: () => fetchConversationForBooking(bookingId as string),
    enabled: bookingId !== undefined,
    retry: false,
  });

export const useMessages = (conversationId: string | undefined) =>
  useQuery({
    queryKey: ['messages', conversationId] as const,
    queryFn: () => fetchMessages(conversationId as string),
    enabled: conversationId !== undefined,
    refetchInterval: POLL_INTERVAL_MS,
    retry: false,
  });

/** Mở luồng từ trang creator — trả về id để điều hướng sang /messages. */
export const useStartConversation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: startConversation,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
  });
};

export const useMessageActions = (conversationId: string | undefined) => {
  const queryClient = useQueryClient();
  const invalidate = (): void => {
    void queryClient.invalidateQueries({ queryKey: ['messages', conversationId] });
    void queryClient.invalidateQueries({ queryKey: ['conversations'] });
    void queryClient.invalidateQueries({ queryKey: ['notifications'] });
  };

  const send = useMutation({
    mutationFn: ({ body, bookingId }: { body: string; bookingId?: string }) =>
      sendMessage(conversationId as string, body, bookingId),
    onSuccess: invalidate,
  });

  const markRead = useMutation({
    mutationFn: () => markMessagesRead(conversationId as string),
    onSuccess: invalidate,
  });

  const remove = useMutation({
    mutationFn: (messageId: string) => removeMessage(conversationId as string, messageId),
    onSuccess: invalidate,
  });

  return { send, markRead, remove };
};
