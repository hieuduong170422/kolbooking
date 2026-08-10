import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  fetchFulfillment,
  requestRevision,
  submitDeliverables,
  type SubmitInput,
} from '../api/submissions-api';

export const useFulfillment = (bookingId: string | undefined) =>
  useQuery({
    queryKey: ['submissions', bookingId] as const,
    queryFn: () => fetchFulfillment(bookingId as string),
    enabled: bookingId !== undefined,
    retry: false,
  });

/** Nộp bài / yêu cầu sửa — đều đổi trạng thái booking nên invalidate cả hai. */
export const useFulfillmentActions = (bookingId: string | undefined) => {
  const queryClient = useQueryClient();
  const invalidate = (): void => {
    void queryClient.invalidateQueries({ queryKey: ['submissions', bookingId] });
    void queryClient.invalidateQueries({ queryKey: ['bookings'] });
    void queryClient.invalidateQueries({ queryKey: ['notifications'] });
  };

  const submit = useMutation({
    mutationFn: (input: SubmitInput) => submitDeliverables(bookingId as string, input),
    onSuccess: invalidate,
  });

  const revise = useMutation({
    mutationFn: (reason: string) => requestRevision(bookingId as string, reason),
    onSuccess: invalidate,
  });

  return { submit, revise };
};
