import { apiDelete, apiGet, apiPost, apiPut } from '../../../shared/api/http-client';
import type { ApiSuccessBody } from '../../../shared/api/api-types';
import type {
  PackageAdmin,
  PackageInput,
  PackageOwner,
  PackagePublic,
  PackageStatus,
} from '../types/package-types';

/** Danh sách package published của một creator (public, PKG-001). */
export const fetchPackagesByCreator = (
  creatorId: string,
  page = 1,
  limit = 12,
): Promise<ApiSuccessBody<readonly PackagePublic[]>> =>
  apiGet<readonly PackagePublic[]>('/packages', { creatorId, page, limit });

/** Toàn bộ package của creator đang đăng nhập (owner). */
export const fetchMyPackages = async (): Promise<readonly PackageOwner[]> => {
  const response = await apiGet<{ packages: readonly PackageOwner[] }>('/packages/me');
  return response.data.packages;
};

export const createPackage = async (input: PackageInput): Promise<PackageOwner> => {
  const response = await apiPost<{ package: PackageOwner }>('/packages', input);
  return response.data.package;
};

export const updatePackage = async (id: string, input: PackageInput): Promise<PackageOwner> => {
  const response = await apiPut<{ package: PackageOwner }>(`/packages/${id}`, input);
  return response.data.package;
};

/** Publish — cần creator Verified + email verified (PKG-007, BR-001). */
export const publishPackage = async (id: string): Promise<PackageOwner> => {
  const response = await apiPost<{ package: PackageOwner }>(`/packages/${id}/publish`);
  return response.data.package;
};

export const unpublishPackage = async (id: string): Promise<PackageOwner> => {
  const response = await apiPost<{ package: PackageOwner }>(`/packages/${id}/unpublish`);
  return response.data.package;
};

/** Chỉ xóa được draft (BR-015). */
export const deleteDraftPackage = async (id: string): Promise<void> => {
  await apiDelete(`/packages/${id}`);
};

/** Moderation queue của admin — mọi package, mọi trạng thái (PKG-010). */
export const fetchPackagesForAdmin = (filter: {
  status?: PackageStatus;
  page: number;
  limit: number;
}): Promise<ApiSuccessBody<readonly PackageAdmin[]>> =>
  apiGet<readonly PackageAdmin[]>('/packages/admin', {
    status: filter.status,
    page: filter.page,
    limit: filter.limit,
  });

export const hidePackage = async (id: string, reason: string): Promise<PackageAdmin> => {
  const response = await apiPost<{ package: PackageAdmin }>(`/packages/${id}/hide`, { reason });
  return response.data.package;
};

export const unhidePackage = async (id: string): Promise<PackageAdmin> => {
  const response = await apiPost<{ package: PackageAdmin }>(`/packages/${id}/unhide`);
  return response.data.package;
};
