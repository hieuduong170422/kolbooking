import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  fetchBrandReviewQueue,
  fetchMyBrand,
  reviewBrand,
  submitBrandForReview,
  updateMyBrand,
  uploadBrandDocument,
} from '../api/brands-api';
import type { BrandStatus } from '../types/brand-types';

export const brandProfileQueryKey = ['brands', 'me'] as const;

/** Hồ sơ brand của user đang đăng nhập — 404 khi chưa có (UI mở form tạo). */
export const useBrandProfile = () =>
  useQuery({
    queryKey: brandProfileQueryKey,
    queryFn: fetchMyBrand,
    retry: false,
  });

/** Nhóm mutation hồ sơ brand (BRD-001..BRD-004). */
export const useBrandActions = () => {
  const queryClient = useQueryClient();
  const invalidate = (): void => {
    void queryClient.invalidateQueries({ queryKey: brandProfileQueryKey });
  };

  const update = useMutation({ mutationFn: updateMyBrand, onSuccess: invalidate });
  const uploadDoc = useMutation({ mutationFn: uploadBrandDocument, onSuccess: invalidate });
  const submit = useMutation({ mutationFn: submitBrandForReview, onSuccess: invalidate });

  return { update, uploadDoc, submit };
};

/** Admin: hàng chờ duyệt brand theo trạng thái (BRD-007). */
export const useBrandReviewQueue = (filter: {
  status: BrandStatus;
  page: number;
  limit: number;
}) =>
  useQuery({
    queryKey: ['brands', 'reviews', filter] as const,
    queryFn: () => fetchBrandReviewQueue(filter),
  });

/** Admin: action duyệt brand — invalidate mọi queue (BRD-007). */
export const useReviewBrand = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      brandId,
      ...input
    }: {
      brandId: string;
      action: 'approve' | 'reject' | 'request_info' | 'suspend';
      reason?: string;
    }) => reviewBrand(brandId, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['brands', 'reviews'] });
    },
  });
};
