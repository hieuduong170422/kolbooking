/**
 * Ambient declaration tối thiểu cho multer 2.x (chưa bundle type riêng).
 * Chỉ khai báo phần dự án dùng — tránh thêm dependency @types/multer.
 */
declare module 'multer' {
  interface MulterFile {
    readonly fieldname: string;
    readonly originalname: string;
    readonly encoding: string;
    readonly mimetype: string;
    readonly size: number;
    readonly buffer: Buffer;
    readonly destination?: string;
    readonly filename?: string;
    readonly path?: string;
  }

  interface StorageEngine {
    _handleFile(req: unknown, file: unknown, callback: unknown): void;
    _removeFile(req: unknown, file: unknown, callback: unknown): void;
  }

  interface MulterLimits {
    readonly fieldSize?: number;
    readonly fileSize?: number;
    readonly files?: number;
    readonly fields?: number;
    readonly parts?: number;
    readonly headerPairs?: number;
  }

  interface MulterOptions {
    readonly dest?: string;
    readonly storage?: StorageEngine;
    readonly limits?: MulterLimits;
    readonly fileFilter?: (
      req: unknown,
      file: MulterFile,
      callback: (error: Error | null, acceptFile: boolean) => void,
    ) => void;
  }

  interface MulterError extends Error {
    readonly name: 'MulterError';
    readonly code: string;
    readonly field?: string;
  }

  interface Multer {
    (options?: MulterOptions): any;
    single(fieldname: string): any;
    array(fieldname: string, maxCount?: number): any;
    fields(fields: readonly { name: string; maxCount?: number }[]): any;
    none(): any;
    memoryStorage(): StorageEngine;
    diskStorage(options: unknown): StorageEngine;
    MulterError: new (code: string, field?: string) => MulterError;
  }

  const multer: Multer;
  export = multer;
}
