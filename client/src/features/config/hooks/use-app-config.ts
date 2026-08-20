import { useQuery } from '@tanstack/react-query';
import { fetchAppConfig } from '../api/config-api';
import { FALLBACK_CONFIG, type AppConfig } from '../types/config-types';

/**
 * Cấu hình công khai, tải một lần cho cả phiên. Trả thẳng AppConfig (không
 * phải trạng thái query) vì mọi nơi dùng đều chỉ cần con số: chưa tải xong
 * hoặc lỗi mạng thì dùng mặc định khớp server thay vì để trống khối tiền.
 */
export const useAppConfig = (): AppConfig => {
  const { data } = useQuery({
    queryKey: ['config'] as const,
    queryFn: fetchAppConfig,
    staleTime: Infinity,
    retry: false,
  });
  return data ?? FALLBACK_CONFIG;
};
