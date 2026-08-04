import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  addPortfolioLink,
  deletePortfolioItem,
  fetchCreatorProfile,
  submitProfileForReview,
  updateAvailability,
  updateCreatorProfile,
  uploadAvatar,
  uploadPortfolio,
} from '../api/creators-api';

// Query key hồ sơ creator đang đăng nhập (CRE-001).
export const creatorProfileQueryKey = ['creators', 'me'] as const;

// Đọc hồ sơ của creator đang đăng nhập. 404 → error; hook KHÔNG redirect (UI xử lý onboarding sau).
export const useCreatorProfile = () =>
  useQuery({
    queryKey: creatorProfileQueryKey,
    queryFn: fetchCreatorProfile,
    retry: false,
  });

// Cập nhật hồ sơ — invalidate profile + danh sách công khai (CRE-001..006).
export const useUpdateCreatorProfile = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateCreatorProfile,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: creatorProfileQueryKey });
      void queryClient.invalidateQueries({ queryKey: ['creators'] });
    },
  });
};

// Gửi hồ sơ chờ admin duyệt — invalidate profile (CRE-007).
export const useSubmitProfileForReview = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: submitProfileForReview,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: creatorProfileQueryKey });
    },
  });
};

// Cập nhật lịch nhận việc — invalidate profile (CRE-010).
export const useUpdateAvailability = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateAvailability,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: creatorProfileQueryKey });
    },
  });
};

// Input của mutation upload portfolio — gom 3 tham số rời của api thành 1 object (CRE-004).
export interface PortfolioUploadInput {
  readonly file: File;
  readonly caption?: string;
  readonly category?: string;
}

// Nhóm thao tác portfolio (CRE-004): mỗi lần thành công đều invalidate ['creators','me'].
// Shape: { upload, addLink, remove } — mỗi trường là một useMutation riêng.
export const usePortfolioActions = () => {
  const queryClient = useQueryClient();
  const invalidateProfile = () => {
    void queryClient.invalidateQueries({ queryKey: creatorProfileQueryKey });
  };

  const upload = useMutation({
    mutationFn: ({ file, caption, category }: PortfolioUploadInput) =>
      uploadPortfolio(file, caption, category),
    onSuccess: invalidateProfile,
  });
  const addLink = useMutation({ mutationFn: addPortfolioLink, onSuccess: invalidateProfile });
  const remove = useMutation({ mutationFn: deletePortfolioItem, onSuccess: invalidateProfile });

  return { upload, addLink, remove };
};

// Upload avatar — invalidate profile (CRE-001).
export const useUploadAvatar = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: uploadAvatar,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: creatorProfileQueryKey });
    },
  });
};
