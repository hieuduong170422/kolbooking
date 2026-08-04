import { promises as fs } from 'node:fs';
import path from 'node:path';
import { assertValidUpload, generateStorageKey } from './file-storage.js';
import type { FileStorage, FileStoragePutInput, StoredFile } from './file-storage.js';

/** Pattern key hợp lệ: UUID (hex + dấu gạch) + extension whitelist — chống path traversal. */
const SAFE_KEY_PATTERN = /^[a-f0-9-]+\.(jpg|png|webp|gif|mp4|webm)$/;

/** FileStorage trên ổ đĩa cục bộ — dùng cho production; ghi vào <uploadsDir>/<key>. */
export class LocalDiskFileStorage implements FileStorage {
  constructor(private readonly uploadsDir: string) {}

  async put(input: FileStoragePutInput): Promise<StoredFile> {
    assertValidUpload(input.mimeType, input.size);
    const key = generateStorageKey(input.mimeType);
    await fs.mkdir(this.uploadsDir, { recursive: true });
    await fs.writeFile(path.join(this.uploadsDir, key), input.buffer);
    return { key, url: `/uploads/${key}` };
  }

  async delete(key: string): Promise<void> {
    if (!SAFE_KEY_PATTERN.test(key)) {
      return;
    }
    try {
      await fs.unlink(path.join(this.uploadsDir, key));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw error;
      }
    }
  }
}
