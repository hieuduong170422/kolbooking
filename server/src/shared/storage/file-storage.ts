import { randomUUID } from 'node:crypto';
import { ApiError } from '../errors/api-error.js';

/** Dữ liệu đầu vào khi lưu một file upload (SEC-005). */
export interface FileStoragePutInput {
  readonly originalName: string;
  readonly mimeType: string;
  readonly size: number;
  readonly buffer: Buffer;
}

/** Kết quả sau khi lưu: key lưu trữ + URL công khai. */
export interface StoredFile {
  readonly key: string;
  readonly url: string;
}

/** Nền tảng lưu trữ file trừu tượng — cho phép đổi InMemory ↔ LocalDisk ↔ S3 tương lai. */
export interface FileStorage {
  put(input: FileStoragePutInput): Promise<StoredFile>;
  delete(key: string): Promise<void>;
  /** Đọc nội dung file theo key — dùng cho file private serve qua endpoint có RBAC (BRD-003). */
  read(key: string): Promise<Buffer | null>;
}

/** Whitelist MIME hợp lệ → extension chuẩn hóa (SEC-005). */
export const MIME_EXTENSIONS: Readonly<Record<string, string>> = Object.freeze({
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
  'video/mp4': '.mp4',
  'video/webm': '.webm',
});

/** Cấu hình upload: MIME được phép + giới hạn kích thước (ảnh ≤ 5MB, video ≤ 50MB). */
export const FILE_STORAGE_CONFIG = Object.freeze({
  allowedMimeTypes: Object.keys(MIME_EXTENSIONS),
  imageMaxBytes: 5 * 1024 * 1024,
  videoMaxBytes: 50 * 1024 * 1024,
});

/**
 * Kiểm tra MIME + kích thước trước khi lưu (SEC-005).
 * Ném ApiError.badRequest nếu loại file không hợp lệ hoặc vượt giới hạn.
 */
export const assertValidUpload = (mimeType: string, size: number): void => {
  if (MIME_EXTENSIONS[mimeType] === undefined) {
    throw ApiError.badRequest(`Loại file không được hỗ trợ: ${mimeType}`);
  }
  const maxBytes = mimeType.startsWith('video/')
    ? FILE_STORAGE_CONFIG.videoMaxBytes
    : FILE_STORAGE_CONFIG.imageMaxBytes;
  if (size > maxBytes) {
    throw ApiError.badRequest(
      `File vượt quá kích thước tối đa ${Math.floor(maxBytes / (1024 * 1024))}MB.`,
    );
  }
};

/**
 * Tạo object key an toàn: UUID ngẫu nhiên + extension theo whitelist MIME.
 * KHÔNG bao giờ dùng originalName để tạo key (chống path traversal, SEC-005).
 */
export const generateStorageKey = (mimeType: string): string => {
  const extension = MIME_EXTENSIONS[mimeType];
  if (extension === undefined) {
    throw ApiError.badRequest(`Loại file không được hỗ trợ: ${mimeType}`);
  }
  return `${randomUUID()}${extension}`;
};
