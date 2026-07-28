import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// globals=false nên auto-cleanup của testing-library không tự chạy — gọi thủ công.
afterEach(() => {
  cleanup();
});
