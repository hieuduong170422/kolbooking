import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createBooking,
  fetchBooking,
  fetchBookings,
  transitionBooking,
  updateBookingBrief,
} from '../api/bookings-api';
import type { BookingAction, BookingBrief, BookingStatus } from '../types/booking-types';

export const useBookings = (filter: { status?: BookingStatus; page: number; limit: number }) =>
  useQuery({
    queryKey: ['bookings', filter] as const,
    queryFn: () => fetchBookings(filter),
  });

export const useBooking = (id: string | undefined) =>
  useQuery({
    queryKey: ['bookings', 'detail', id] as const,
    queryFn: () => fetchBooking(id as string),
    enabled: id !== undefined,
    retry: false,
  });

export const useCreateBooking = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createBooking,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['bookings'] });
    },
  });
};

/** Chuyển trạng thái + sửa brief — cùng invalidate chi tiết và danh sách. */
export const useBookingActions = () => {
  const queryClient = useQueryClient();
  const invalidate = (): void => {
    void queryClient.invalidateQueries({ queryKey: ['bookings'] });
  };

  const transition = useMutation({
    mutationFn: ({
      id,
      action,
      reason,
    }: {
      id: string;
      action: BookingAction;
      reason?: string;
    }) => transitionBooking(id, action, reason),
    onSuccess: invalidate,
  });

  const updateBrief = useMutation({
    mutationFn: ({ id, brief }: { id: string; brief: Omit<BookingBrief, 'version'> }) =>
      updateBookingBrief(id, brief),
    onSuccess: invalidate,
  });

  return { transition, updateBrief };
};
