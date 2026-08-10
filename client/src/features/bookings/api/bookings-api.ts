import { apiGet, apiPost, apiPut } from '../../../shared/api/http-client';
import type { ApiSuccessBody } from '../../../shared/api/api-types';
import type {
  Booking,
  BookingAction,
  BookingBrief,
  BookingStatus,
  CreateBookingInput,
} from '../types/booking-types';

export const createBooking = async (input: CreateBookingInput): Promise<Booking> => {
  const response = await apiPost<{ booking: Booking }>('/bookings', input);
  return response.data.booking;
};

/** Danh sách theo vai — server tự lọc theo người đăng nhập. */
export const fetchBookings = (filter: {
  status?: BookingStatus;
  page: number;
  limit: number;
}): Promise<ApiSuccessBody<readonly Booking[]>> =>
  apiGet<readonly Booking[]>('/bookings', {
    status: filter.status,
    page: filter.page,
    limit: filter.limit,
  });

export const fetchBooking = async (id: string): Promise<Booking> => {
  const response = await apiGet<{ booking: Booking }>(`/bookings/${id}`);
  return response.data.booking;
};

export const updateBookingBrief = async (
  id: string,
  brief: Omit<BookingBrief, 'version'>,
): Promise<Booking> => {
  const response = await apiPut<{ booking: Booking }>(`/bookings/${id}/brief`, { brief });
  return response.data.booking;
};

/** Mọi chuyển trạng thái đi qua một endpoint — server quyết định hợp lệ. */
export const transitionBooking = async (
  id: string,
  action: BookingAction,
  reason?: string,
): Promise<Booking> => {
  const response = await apiPost<{ booking: Booking }>(
    `/bookings/${id}/transition`,
    reason === undefined ? { action } : { action, reason },
  );
  return response.data.booking;
};
