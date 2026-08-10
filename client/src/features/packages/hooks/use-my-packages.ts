import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createPackage,
  fetchPackagesForAdmin,
  hidePackage,
  unhidePackage,
  deleteDraftPackage,
  fetchMyPackages,
  publishPackage,
  unpublishPackage,
  updatePackage,
} from '../api/packages-api';
import type { PackageInput, PackageStatus } from '../types/package-types';

export const myPackagesQueryKey = ['packages', 'me'] as const;

/** Danh sách package của creator đang đăng nhập (mọi trạng thái). */
export const useMyPackages = () =>
  useQuery({
    queryKey: myPackagesQueryKey,
    queryFn: fetchMyPackages,
    retry: false,
  });

/**
 * Nhóm mutation quản lý package (PKG-001, PKG-007) — mỗi lần thành công
 * invalidate danh sách owner + danh sách public (giá "từ" có thể đổi).
 */
export const usePackageActions = () => {
  const queryClient = useQueryClient();
  const invalidate = (): void => {
    void queryClient.invalidateQueries({ queryKey: myPackagesQueryKey });
    void queryClient.invalidateQueries({ queryKey: ['packages'] });
    void queryClient.invalidateQueries({ queryKey: ['creators'] });
  };

  const create = useMutation({ mutationFn: createPackage, onSuccess: invalidate });
  const update = useMutation({
    mutationFn: ({ id, input }: { id: string; input: PackageInput }) => updatePackage(id, input),
    onSuccess: invalidate,
  });
  const publish = useMutation({ mutationFn: publishPackage, onSuccess: invalidate });
  const unpublish = useMutation({ mutationFn: unpublishPackage, onSuccess: invalidate });
  const removeDraft = useMutation({ mutationFn: deleteDraftPackage, onSuccess: invalidate });

  return { create, update, publish, unpublish, removeDraft };
};

/** Moderation queue của admin (PKG-010) — tách khỏi hook owner. */
export const useAdminPackages = (filter: {
  status?: PackageStatus;
  page: number;
  limit: number;
}) =>
  useQuery({
    queryKey: ['admin', 'packages', filter] as const,
    queryFn: () => fetchPackagesForAdmin(filter),
  });

export const usePackageModeration = () => {
  const queryClient = useQueryClient();
  const invalidate = (): void => {
    void queryClient.invalidateQueries({ queryKey: ['admin', 'packages'] });
    void queryClient.invalidateQueries({ queryKey: ['admin', 'audit'] });
    void queryClient.invalidateQueries({ queryKey: ['packages'] });
  };

  const hide = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => hidePackage(id, reason),
    onSuccess: invalidate,
  });
  const unhide = useMutation({ mutationFn: unhidePackage, onSuccess: invalidate });

  return { hide, unhide };
};
