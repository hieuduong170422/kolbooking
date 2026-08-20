import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import type { Server } from 'node:http';
import express from 'express';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { mountClient } from '../src/shared/http/serve-client.js';
import { notFoundHandler } from '../src/shared/middlewares/not-found.js';
import { listenTestApp } from './helpers/test-server.js';

/**
 * API phục vụ luôn bản build của client (một tiến trình chạy được cả giao diện
 * lẫn API). Test dựng một thư mục build giả để không phụ thuộc vào việc client
 * đã được build hay chưa.
 */

const INDEX_HTML = '<!doctype html><title>KOL Booking</title><div id="root"></div>';

let clientDir: string;
let app: Server;

beforeAll(async () => {
  clientDir = await mkdtemp(path.join(tmpdir(), 'kb-client-'));
  await writeFile(path.join(clientDir, 'index.html'), INDEX_HTML);
  await mkdir(path.join(clientDir, 'assets'));
  await writeFile(path.join(clientDir, 'assets', 'index-abc123.js'), 'console.log(1)');

  const expressApp = express();
  // Mô phỏng thứ tự thật: API đứng trước, client đứng sau, 404 JSON chốt cuối.
  expressApp.get('/api/v1/health', (_req, res) => {
    res.json({ success: true });
  });
  mountClient(expressApp, clientDir);
  expressApp.use(notFoundHandler);
  app = listenTestApp(expressApp);
});

afterAll(async () => {
  await rm(clientDir, { recursive: true, force: true });
});

describe('phục vụ bản build của client', () => {
  it('trả index.html ở trang gốc', async () => {
    const response = await request(app).get('/');

    expect(response.status).toBe(200);
    expect(response.text).toContain('id="root"');
    // index.html tham chiếu tên file tài sản có hash — cache lại là kẹt bản cũ.
    expect(response.headers['cache-control']).toBe('no-cache');
  });

  it('trả index.html cho route phía client để React Router tự định tuyến', async () => {
    for (const route of ['/creators/crt_0001', '/bookings/bkg_1', '/messages']) {
      const response = await request(app).get(route);
      expect(response.status).toBe(200);
      expect(response.text).toContain('id="root"');
    }
  });

  it('phục vụ file tài sản thật kèm cache dài ngày', async () => {
    const response = await request(app).get('/assets/index-abc123.js');

    expect(response.status).toBe(200);
    expect(response.text).toBe('console.log(1)');
    expect(response.headers['cache-control']).toContain('immutable');
  });

  it('KHÔNG nuốt lỗi 404 của API — client phải nhận JSON, không phải HTML', async () => {
    const response = await request(app).get('/api/v1/khong-ton-tai');

    expect(response.status).toBe(404);
    expect(response.text).not.toContain('id="root"');
  });

  it('không đụng tới đường dẫn upload', async () => {
    const response = await request(app).get('/uploads/khong-co.png');

    expect(response.status).toBe(404);
    expect(response.text).not.toContain('id="root"');
  });

  it('không trả trang HTML cho request ghi dữ liệu', async () => {
    const response = await request(app).post('/creators');

    expect(response.status).toBe(404);
    expect(response.text).not.toContain('id="root"');
  });

  it('API đang hoạt động vẫn đi đúng route của nó', async () => {
    const response = await request(app).get('/api/v1/health');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ success: true });
  });
});
