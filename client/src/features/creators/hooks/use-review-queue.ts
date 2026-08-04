import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchReviewQueue, reviewCreator } from '../api/creators-api';
import type { CreatorStatus } from '../types/creator-types';
import { creatorProfileQueryKey } from './use-creator-profile';

// Bộ lọc hàng chờ duyệt của admin (CRE-008).
export interface ReviewQueueFilter {
  readonly status?: CreatorStatus;
  readonly page?: number;
  readonly limit?: number;
}

// Query key hàng chờ duyệt — gồm filter để phân trang/tab theo status (CRE-008).
export const reviewQueueQueryKey = (filter?: ReviewQueueFilter) =>
  ['creators', 'reviews', filter] as const;

// Đọc hàng chờ — trả về NGUYÊN envelope (data + meta) để giữ phân trang, KHÔNG unwrap.
export const useReviewQueue = (filter?: ReviewQueueFilter) =>
  useQuery({
    queryKey: reviewQueueQueryKey(filter),
    queryFn: () => fetchReviewQueue(filter),
    retry: false,
  });

// Input của mutation duyệt creator — gom creatorId + action thành 1 object (CRE-008).
export interface ReviewCreatorInput {
  readonly creatorId: string;
  readonly action: 'approve' | 'reject' | 'request_info' | 'suspend';
  readonly reason?: string;
}

// Admin duyệt/từ chối/yêu cầu bổ sung/tạm khóa — invalidate hàng chờ + profile (CRE-008).
export const useReviewCreator = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ creatorId, action, reason }: ReviewCreatorInput) =>
      reviewCreator(creatorId, { action, reason }),
    onSuccess: () => {
void queryClient.invalidateQueries({ queryKey: ['creators', 'reviews'] });
void queryClient.invalidateQueries({ queryKey: creatorProfileQueryKey });
    },
  });
};
