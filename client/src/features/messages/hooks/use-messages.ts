import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchMessages, markMessagesRead, removeMessage, sendMessage } from '../api/messages-api';

/** Polling 8 giây — đủ cho MVP, nâng lên SSE khi có nhu cầu thật. */
const POLL_INTERVAL_MS = 8_000;

export const useMessages = (bookingId: string | undefined) =>
  useQuery({
    queryKey: ['messages', bookingId] as const,
    queryFn: () => fetchMessages(bookingId as string),
    enabled: bookingId !== undefined,
    refetchInterval: POLL_INTERVAL_MS,
    retry: false,
  });

export const useMessageActions = (bookingId: string | undefined) => {
  const queryClient = useQueryClient();
  const invalidate = (): void => {
    void queryClient.invalidateQueries({ queryKey: ['messages', bookingId] });
    // Tin mới sinh thông báo cho phía kia; làm mới chuông cho chính mình.
    void queryClient.invalidateQueries({ queryKey: ['notifications'] });
  };

  const send = useMutation({
    mutationFn: (body: string) => sendMessage(bookingId as string, body),
    onSuccess: invalidate,
  });

  const markRead = useMutation({
    mutationFn: () => markMessagesRead(bookingId as string),
    onSuccess: invalidate,
  });

  const remove = useMutation({
    mutationFn: (messageId: string) => removeMessage(bookingId as string, messageId),
    onSuccess: invalidate,
  });

  return { send, markRead, remove };
};
