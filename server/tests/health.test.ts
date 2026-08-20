import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { buildTestServer } from './helpers/test-server.js';

describe('GET /api/v1/health', () => {
  it('trả về envelope success với status ok', async () => {
    const response = await request(buildTestServer()).get('/api/v1/health');

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.error).toBeNull();
    expect(response.body.data.status).toBe('ok');
    expect(typeof response.body.data.uptimeSeconds).toBe('number');
  });

  it('trả về 404 envelope cho đường dẫn không tồn tại', async () => {
    const response = await request(buildTestServer()).get('/api/v1/unknown');

    expect(response.status).toBe(404);
    expect(response.body.success).toBe(false);
    expect(response.body.error.code).toBe('NOT_FOUND');
  });
});
