import { apiDelete, apiGet, apiPatch, apiPost, apiUpload } from '../../../shared/api/http-client';
import type { ApiSuccessBody } from '../../../shared/api/api-types';
import type {
  AvailabilityUpdate,
  Creator,
  CreatorAdmin,
  CreatorListFilter,
  CreatorOwner,
  CreatorProfileInput,
  CreatorStatus,
  PortfolioItem,
} from '../types/creator-types';

export const fetchCreators = (
  filter: CreatorListFilter,
): Promise<ApiSuccessBody<readonly Creator[]>> =>
  apiGet<readonly Creator[]>('/creators', {
    search: filter.search,
    city: filter.city,
    creatorType: filter.creatorType,
    platform: filter.platform,
    sort: filter.sort,
    page: filter.page,
    limit: filter.limit,
  });

export const fetchCreatorById = async (id: string): Promise<Creator> => {
  const response = await apiGet<Creator>(`/creators/${id}`);
  return response.data;
};

/** Hồ sơ của creator đang đăng nhập (CRE-001). */
export const fetchCreatorProfile = async (): Promise<CreatorOwner> => {
  const response = await apiGet<CreatorOwner>('/creators/me');
  return response.data;
};

/** Cập nhật hồ sơ — PUT full replace (CRE-001..006). */
export const updateCreatorProfile = async (input: CreatorProfileInput): Promise<CreatorOwner> => {
  const response = await apiPatch<CreatorOwner>('/creators/me', input);
  return response.data;
};

/** Gửi hồ sơ chờ admin duyệt (CRE-007). */
export const submitProfileForReview = async (): Promise<CreatorOwner> => {
  const response = await apiPost<CreatorOwner>('/creators/me/submit-review');
  return response.data;
};

/** Cập nhật lịch nhận việc (CRE-010). */
export const updateAvailability = async (input: AvailabilityUpdate): Promise<CreatorOwner> => {
  const response = await apiPatch<CreatorOwner>('/creators/me/availability', input);
  return response.data;
};

/** Upload ảnh/video vào portfolio (CRE-004). */
export const uploadPortfolio = async (
  file: File,
  caption?: string,
  category?: string,
): Promise<PortfolioItem> => {
  const formData = new FormData();
  formData.append('file', file);
  if (caption !== undefined) formData.append('caption', caption);
  if (category !== undefined) formData.append('category', category);
  const response = await apiUpload<PortfolioItem>('/creators/me/portfolio', formData);
  return response.data;
};

/** Thêm link vào portfolio — server yêu cầu body có `type: 'link'` (CRE-004). */
export const addPortfolioLink = async (input: {
  url: string;
  caption?: string;
  category?: string;
}): Promise<PortfolioItem> => {
  const response = await apiPost<PortfolioItem>('/creators/me/portfolio', {
    ...input,
    type: 'link',
  });
  return response.data;
};

/** Xóa một mục portfolio (CRE-004). */
export const deletePortfolioItem = async (itemId: string): Promise<void> => {
  await apiDelete(`/creators/me/portfolio/${itemId}`);
};

/** Upload avatar của creator (CRE-001). */
export const uploadAvatar = async (file: File): Promise<CreatorOwner> => {
  const formData = new FormData();
  formData.append('file', file);
  const response = await apiUpload<CreatorOwner>('/creators/me/avatar', formData);
  return response.data;
};

/** Hàng chờ duyệt của admin — trả nguyên envelope để giữ meta phân trang (CRE-008). */
export const fetchReviewQueue = (
  filter?: { status?: CreatorStatus; page?: number; limit?: number },
): Promise<ApiSuccessBody<readonly CreatorAdmin[]>> =>
  apiGet<readonly CreatorAdmin[]>('/creators/reviews', {
    status: filter?.status,
    page: filter?.page,
    limit: filter?.limit,
  });

/** Admin duyệt/từ chối/yêu cầu bổ sung/tạm khóa creator (CRE-008). */
export const reviewCreator = async (
  creatorId: string,
  input: { action: 'approve' | 'reject' | 'request_info' | 'suspend'; reason?: string },
): Promise<CreatorAdmin> => {
  const response = await apiPost<CreatorAdmin>(`/creators/${creatorId}/review`, input);
  return response.data;
};
