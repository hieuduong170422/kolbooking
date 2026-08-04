import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { ApiError } from '../src/shared/errors/api-error.js';
import {
  FILE_STORAGE_CONFIG,
  assertValidUpload,
  generateStorageKey,
} from '../src/shared/storage/file-storage.js';
import type { FileStoragePutInput } from '../src/shared/storage/file-storage.js';
import { InMemoryFileStorage } from '../src/shared/storage/file-storage.memory.js';
import { LocalDiskFileStorage } from '../src/shared/storage/file-storage.local.js';

const makeImageInput = (overrides: Partial<FileStoragePutInput> = {}): FileStoragePutInput => ({
  originalName: 'anh-dai-dien.png',
  mimeType: 'image/png',
  size: 1024,
  buffer: Buffer.from('fake-png-content'),
  ...overrides,
});

describe('assertValidUpload (SEC-005)', () => {
  it('chấp nhận ảnh png đúng giới hạn tối đa 5MB', () => {
    expect(() => assertValidUpload('image/png', FILE_STORAGE_CONFIG.imageMaxBytes)).not.toThrow();
  });

  it('chấp nhận video mp4 đúng giới hạn tối đa 50MB', () => {
    expect(() => assertValidUpload('video/mp4', FILE_STORAGE_CONFIG.videoMaxBytes)).not.toThrow();
  });

  it('ném BAD_REQUEST cho MIME không nằm trong whitelist', () => {
    expect(() => assertValidUpload('text/html', 100)).toThrowError(
      expect.objectContaining({ statusCode: 400, code: 'BAD_REQUEST' }),
    );
  });

  it('ném BAD_REQUEST khi ảnh vượt quá 5MB', () => {
    expect(() =>
      assertValidUpload('image/png', FILE_STORAGE_CONFIG.imageMaxBytes + 1),
    ).toThrowError(expect.objectContaining({ statusCode: 400, code: 'BAD_REQUEST' }));
  });

  it('ném BAD_REQUEST khi video vượt quá 50MB', () => {
    expect(() =>
      assertValidUpload('video/webm', FILE_STORAGE_CONFIG.videoMaxBytes + 1),
    ).toThrowError(expect.objectContaining({ statusCode: 400, code: 'BAD_REQUEST' }));
  });
});

describe('generateStorageKey (SEC-005)', () => {
  it('tạo key từ UUID ngẫu nhiên + extension theo MIME whitelist', () => {
    expect(generateStorageKey('image/png')).toMatch(/^[0-9a-f-]+\.png$/);
    expect(generateStorageKey('video/mp4')).toMatch(/^[0-9a-f-]+\.mp4$/);
  });

  it('key không chứa ký tự đường dẫn (chống path traversal)', () => {
    const key = generateStorageKey('image/webp');
    expect(key).not.toMatch(/[/\\]/);
  });
});

describe('InMemoryFileStorage', () => {
  let storage: InMemoryFileStorage;

  beforeEach(() => {
    storage = new InMemoryFileStorage();
  });

  it('put hợp lệ trả về StoredFile (key + url /uploads/<key>) và lưu buffer (SEC-005)', async () => {
    const stored = await storage.put(makeImageInput());

    expect(stored.key).toMatch(/^[0-9a-f-]+\.png$/);
    expect(stored.url).toBe(`/uploads/${stored.key}`);
    expect(storage.get(stored.key)).toBeDefined();
  });

  it('put không dùng originalName làm key (chống path traversal)', async () => {
    const stored = await storage.put(makeImageInput({ originalName: '../../etc/passwd.png' }));

    expect(stored.key).not.toContain('..');
    expect(stored.key).not.toMatch(/[/\\]/);
    expect(stored.key).not.toContain('etc');
  });

  it('put với MIME sai ném 400 và không lưu gì', async () => {
    await expect(storage.put(makeImageInput({ mimeType: 'text/html' }))).rejects.toMatchObject({
      statusCode: 400,
      code: 'BAD_REQUEST',
    });
    expect(storage.get('anything')).toBeUndefined();
  });

  it('put với ảnh quá 5MB ném 400 và không lưu gì', async () => {
    await expect(
      storage.put(makeImageInput({ size: FILE_STORAGE_CONFIG.imageMaxBytes + 1 })),
    ).rejects.toMatchObject({ statusCode: 400, code: 'BAD_REQUEST' });
    expect(storage.get('anything')).toBeUndefined();
  });

  it('delete xóa buffer đã lưu', async () => {
    const stored = await storage.put(makeImageInput());
    expect(storage.get(stored.key)).toBeDefined();

    await storage.delete(stored.key);

    expect(storage.get(stored.key)).toBeUndefined();
  });

  it('delete key không tồn tại resolve im lặng (không throw)', async () => {
    await expect(storage.delete('khong-ton-tai.png')).resolves.toBeUndefined();
  });
});

describe('LocalDiskFileStorage', () => {
  let tempDir: string;
  let storage: LocalDiskFileStorage;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'kolbooking-uploads-'));
    storage = new LocalDiskFileStorage(tempDir);
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it('put hợp lệ ghi file xuống đĩa và trả về url /uploads/<key> (SEC-005)', async () => {
    const stored = await storage.put(makeImageInput());

    expect(stored.key).toMatch(/\.png$/);
    expect(stored.url).toBe(`/uploads/${stored.key}`);
    await expect(fs.access(path.join(tempDir, stored.key))).resolves.toBeUndefined();
  });

  it('put với MIME sai ném 400 và không ghi file nào ra đĩa', async () => {
    await expect(storage.put(makeImageInput({ mimeType: 'text/html' }))).rejects.toMatchObject({
      statusCode: 400,
      code: 'BAD_REQUEST',
    });

    expect(await fs.readdir(tempDir)).toEqual([]);
  });

  it('put với video quá 50MB ném 400 và không ghi file nào ra đĩa', async () => {
    await expect(
      storage.put(
        makeImageInput({ mimeType: 'video/mp4', size: FILE_STORAGE_CONFIG.videoMaxBytes + 1 }),
      ),
    ).rejects.toMatchObject({ statusCode: 400, code: 'BAD_REQUEST' });

    expect(await fs.readdir(tempDir)).toEqual([]);
  });

  it('delete xóa file trên đĩa', async () => {
    const stored = await storage.put(makeImageInput());
    await expect(fs.access(path.join(tempDir, stored.key))).resolves.toBeUndefined();

    await storage.delete(stored.key);

    await expect(fs.access(path.join(tempDir, stored.key))).rejects.toMatchObject({
      code: 'ENOENT',
    });
  });

  it('delete key không tồn tại resolve im lặng (không throw)', async () => {
    await expect(storage.delete('khong-ton-tai.png')).resolves.toBeUndefined();
  });

  it('delete key chứa ký tự đường dẫn bị bỏ qua (chống path traversal)', async () => {
    await expect(storage.delete('../../etc/passwd.png')).resolves.toBeUndefined();
  });
});
