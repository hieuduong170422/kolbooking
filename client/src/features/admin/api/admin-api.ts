import { apiGet, apiPost } from '../../../shared/api/http-client';
import type { ApiSuccessBody } from '../../../shared/api/api-types';
import type {
  AdminUser,
  AuditEntry,
  AuditListFilter,
  UserListFilter,
} from '../types/admin-types';

/** Danh sách tài khoản cho admin — giữ envelope để lấy meta phân trang (ADM-002). */
export const fetchUsers = (
  filter: UserListFilter,
): Promise<ApiSuccessBody<readonly AdminUser[]>> =>
  apiGet<readonly AdminUser[]>('/users', {
    search: filter.search,
    role: filter.role,
    status: filter.status,
    page: filter.page,
    limit: filter.limit,
  });

/** Khóa tài khoản — thu hồi toàn bộ phiên, bắt buộc lý do (ADM-004, AUTH-006). */
export const lockUser = async (userId: string, reason: string): Promise<AdminUser> => {
  const response = await apiPost<{ user: AdminUser }>(`/users/${userId}/lock`, { reason });
  return response.data.user;
};

export const unlockUser = async (userId: string): Promise<AdminUser> => {
  const response = await apiPost<{ user: AdminUser }>(`/users/${userId}/unlock`);
  return response.data.user;
};

/** Audit log — chỉ đọc (ADM-009). */
export const fetchAuditEntries = (
  filter: AuditListFilter,
): Promise<ApiSuccessBody<readonly AuditEntry[]>> =>
  apiGet<readonly AuditEntry[]>('/audit', {
    targetType: filter.targetType,
    action: filter.action,
    page: filter.page,
    limit: filter.limit,
  });
