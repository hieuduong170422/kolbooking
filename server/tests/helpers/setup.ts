import { afterAll } from 'vitest';
import { closeAllTestServers } from './server-registry.js';

/**
 * Chạy cho MỌI file test (vitest.config.ts → setupFiles). Đóng các server
 * test đã mở khi file chạy xong, để file test không phải tự nhớ dọn.
 */
afterAll(closeAllTestServers);
