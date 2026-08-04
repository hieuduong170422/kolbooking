import { assertValidUpload, generateStorageKey } from './file-storage.js';
import type { FileStorage, FileStoragePutInput, StoredFile } from './file-storage.js';

/** FileStorage trong bộ nhớ — dùng cho test, không ghi đĩa (SEC-005). */
export class InMemoryFileStorage implements FileStorage {
  private readonly files = new Map<string, Buffer>();

  async put(input: FileStoragePutInput): Promise<StoredFile> {
    assertValidUpload(input.mimeType, input.size);
    const key = generateStorageKey(input.mimeType);
    this.files.set(key, input.buffer);
    return { key, url: `/uploads/${key}` };
  }

  async delete(key: string): Promise<void> {
    this.files.delete(key);
  }

  /** Trả về buffer đã lưu theo key — dùng để assert trong test. */
  get(key: string): Buffer | undefined {
    return this.files.get(key);
  }
}
