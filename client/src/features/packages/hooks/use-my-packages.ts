import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createPackage,
  deleteDraftPackage,
  fetchMyPackages,
  publishPackage,
  unpublishPackage,
  updatePackage,
} from '../api/packages-api';
import type { PackageInput } from '../types/package-types';

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
