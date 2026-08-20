import { apiGet } from '../../../shared/api/http-client';
import type { AppConfig } from '../types/config-types';

/** Cấu hình công khai — không cần đăng nhập, không đổi giữa các phiên. */
export const fetchAppConfig = async (): Promise<AppConfig> => {
  const response = await apiGet<AppConfig>('/config');
  return response.data;
};
