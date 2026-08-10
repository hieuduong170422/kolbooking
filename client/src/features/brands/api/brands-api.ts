import { apiGet, apiPost, apiPut, apiUpload } from '../../../shared/api/http-client';
import type { ApiSuccessBody } from '../../../shared/api/api-types';
import type {
  BrandAdmin,
  BrandOwner,
  BrandProfileInput,
  BrandStatus,
} from '../types/brand-types';

/** Hồ sơ brand của user đang đăng nhập (BRD-001). */
export const fetchMyBrand = async (): Promise<BrandOwner> => {
  const response = await apiGet<{ brand: BrandOwner }>('/brands/me');
  return response.data.brand;
};

/** Tạo/cập nhật hồ sơ — PUT full replace (BRD-001..BRD-005). */
export const updateMyBrand = async (input: BrandProfileInput): Promise<BrandOwner> => {
  const response = await apiPut<{ brand: BrandOwner }>('/brands/me', input);
  return response.data.brand;
};

/** Upload giấy tờ xác minh — file private, chỉ admin/chính chủ xem (BRD-003). */
export const uploadBrandDocument = async (file: File): Promise<BrandOwner> => {
  const formData = new FormData();
  formData.append('file', file);
  const response = await apiUpload<{ brand: BrandOwner }>('/brands/me/documents', formData);
  return response.data.brand;
};

/** Gửi hồ sơ chờ admin duyệt (BRD-004). */
export const submitBrandForReview = async (): Promise<BrandOwner> => {
  const response = await apiPost<{ brand: BrandOwner }>('/brands/me/submit-review');
  return response.data.brand;
};

/** Admin: hàng chờ duyệt brand — giữ nguyên envelope để lấy meta (BRD-007). */
export const fetchBrandReviewQueue = (filter?: {
  status?: BrandStatus;
  page?: number;
  limit?: number;
}): Promise<ApiSuccessBody<readonly BrandAdmin[]>> =>
  apiGet<readonly BrandAdmin[]>('/brands/reviews', {
    status: filter?.status,
    page: filter?.page,
    limit: filter?.limit,
  });

/** Admin duyệt/từ chối/yêu cầu bổ sung/tạm khóa brand (BRD-007). */
export const reviewBrand = async (
  brandId: string,
  input: { action: 'approve' | 'reject' | 'request_info' | 'suspend'; reason?: string },
): Promise<BrandAdmin> => {
  const response = await apiPost<{ brand: BrandAdmin }>(`/brands/${brandId}/review`, input);
  return response.data.brand;
};
