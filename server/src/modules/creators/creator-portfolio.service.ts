import { randomUUID } from 'node:crypto';
import { ApiError } from '../../shared/errors/api-error.js';
import { assertValidUpload } from '../../shared/storage/file-storage.js';
import type { FileStorage, FileStoragePutInput } from '../../shared/storage/file-storage.js';
import { toCreatorOwnerDto } from './creator.mapper.js';
import type { CreatorRepository } from './creator.repository.js';
import type { CreatorOwnerDto, PortfolioItem } from './creator.types.js';

/** File sau khi multer (memoryStorage) parse — cấu trúc con của req.file. */
export interface UploadedFile {
  readonly originalname: string;
  readonly mimetype: string;
  readonly size: number;
  readonly buffer: Buffer;
}

const UPLOADS_URL_PREFIX = '/uploads/';

/** Loại item theo prefix MIME: image/* → image, còn lại (đã qua whitelist) → video. */
const itemTypeFromMime = (mimeType: string): 'image' | 'video' =>
  mimeType.startsWith('video/') ? 'video' : 'image';

/**
 * Service layer: thêm/xóa mục portfolio + cập nhật avatar (CRE-004, SEC-005).
 * File luôn đi qua FileStorage.put (sinh key UUID an toàn) — không bao giờ
 * dùng filename của user; mọi mục đều thuộc hồ sơ của chính user (ownership).
 */
export class CreatorPortfolioService {
  private readonly repository: CreatorRepository;
  private readonly fileStorage: FileStorage;

  constructor(repository: CreatorRepository, fileStorage: FileStorage) {
    this.repository = repository;
    this.fileStorage = fileStorage;
  }

  async uploadImageOrVideo(
    userId: string,
    file: UploadedFile,
    caption: string | null,
    category: string | null,
  ): Promise<PortfolioItem> {
    assertValidUpload(file.mimetype, file.size);
    const creator = await this.repository.findByUserId(userId);
    if (!creator) throw ApiError.profileNotFound();

    const stored = await this.fileStorage.put(this.toPutInput(file));
    const item: PortfolioItem = {
      id: `item_${randomUUID()}`,
      type: itemTypeFromMime(file.mimetype),
      url: stored.url,
      caption,
      category,
      thumbnailUrl: null,
      createdAt: new Date().toISOString(),
    };
    const updated = await this.repository.addPortfolioItem(creator.id, item);
    if (!updated) {
      throw ApiError.notFound('Không tìm thấy creator này.');
    }
    return item;
  }

  async addLinkItem(
    userId: string,
    url: string,
    caption: string | null,
    category: string | null,
  ): Promise<PortfolioItem> {
    const creator = await this.repository.findByUserId(userId);
    if (!creator) throw ApiError.profileNotFound();

    const item: PortfolioItem = {
      id: `item_${randomUUID()}`,
      type: 'link',
      url,
      caption,
      category,
      thumbnailUrl: null,
      createdAt: new Date().toISOString(),
    };
    const updated = await this.repository.addPortfolioItem(creator.id, item);
    if (!updated) {
      throw ApiError.notFound('Không tìm thấy creator này.');
    }
    return item;
  }

  async removeItem(userId: string, itemId: string): Promise<void> {
    const creator = await this.repository.findByUserId(userId);
    if (!creator) throw ApiError.profileNotFound();

    const item = creator.portfolioItems.find((entry) => entry.id === itemId);
    if (!item) throw ApiError.notFound('Không tìm thấy mục portfolio này.');

    if (item.url.startsWith(UPLOADS_URL_PREFIX)) {
      const key = item.url.slice(UPLOADS_URL_PREFIX.length);
      await this.fileStorage.delete(key);
    }

    const updated = await this.repository.removePortfolioItem(creator.id, itemId);
    if (!updated) {
      throw ApiError.notFound('Không tìm thấy creator này.');
    }
  }

  async updateAvatar(userId: string, file: UploadedFile): Promise<CreatorOwnerDto> {
    assertValidUpload(file.mimetype, file.size);
    if (!file.mimetype.startsWith('image/')) {
      throw ApiError.badRequest('Avatar phải là file ảnh.');
    }
    const creator = await this.repository.findByUserId(userId);
    if (!creator) throw ApiError.profileNotFound();

    const stored = await this.fileStorage.put(this.toPutInput(file));
    const updated = await this.repository.update(creator.id, { ...creator, avatarUrl: stored.url });
    if (!updated) {
      throw ApiError.notFound('Không tìm thấy creator này.');
    }
    return toCreatorOwnerDto(updated);
  }

  private toPutInput(file: UploadedFile): FileStoragePutInput {
    return {
      originalName: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
      buffer: file.buffer,
    };
  }
}
