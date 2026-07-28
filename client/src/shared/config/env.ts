/** Cấu hình client đọc từ Vite env; mặc định đi qua proxy dev của Vite. */
export const clientEnv = Object.freeze({
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL ?? '/api/v1',
});
