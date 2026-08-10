import { randomUUID } from 'node:crypto';
import { ApiError } from '../../shared/errors/api-error.js';
import { MIME_EXTENSIONS } from '../../shared/storage/file-storage.js';
import type { FileStorage } from '../../shared/storage/file-storage.js';
import type { AuditRepository } from '../audit/audit.repository.js';
import type { UserRepository } from '../users/user.repository.js';
import { toBrandAdminDto, toBrandOwnerDto } from './brand.mapper.js';
import type { BrandRepository } from './brand.repository.js';
import type {
  Brand,
  BrandAdminDto,
  BrandOwnerDto,
  BrandProfileInput,
  BrandStatus,
} from './brand.types.js';
import type { BrandReviewAction } from './brand.validation.js';

export interface BrandReviewPage {
  readonly items: readonly BrandAdminDto[];
  readonly total: number;
  readonly page: number;
  readonly limit: number;
}

export interface BrandDocFile {
  readonly buffer: Buffer;
  readonly mimeType: string;
  readonly fileName: string;
}

export interface UploadedDocInput {
  readonly originalName: string;
  readonly mimeType: string;
  readonly size: number;
  readonly buffer: Buffer;
}

const ACTIONS_REQUIRING_REASON: readonly BrandReviewAction[] = [
  'reject',
  'request_info',
  'suspend',
];

/** Máy trạng thái duyệt brand — mirror creator-review (BRD-004, BRD-007). */
const NEXT_STATUS_BY_ACTION: Record<BrandReviewAction, BrandStatus> = {
  approve: 'verified',
  reject: 'rejected',
  request_info: 'info_required',
  suspend: 'suspended',
};

const ALLOWED_FROM_BY_ACTION: Record<BrandReviewAction, readonly BrandStatus[]> = {
  approve: ['pending_review'],
  reject: ['pending_review'],
  request_info: ['pending_review'],
  suspend: ['verified'],
};

/** MIME → extension để trả file doc đúng content-type (chỉ ảnh trong MVP). */
const DOC_MIME_BY_EXTENSION: Readonly<Record<string, string>> = Object.fromEntries(
  Object.entries(MIME_EXTENSIONS).map(([mime, ext]) => [ext, mime]),
);

/**
 * Business rules hồ sơ brand (BRD-001..BRD-005, BRD-007):
 * transition matrix mirror creator; giấy tờ xác minh lưu storage PRIVATE,
 * chỉ owner/admin đọc qua endpoint có kiểm quyền; mọi action duyệt có audit.
 */
export class BrandService {
  private readonly brands: BrandRepository;
  private readonly users: UserRepository;
  private readonly audit: AuditRepository;
  private readonly privateStorage: FileStorage;

  constructor(
    brands: BrandRepository,
    users: UserRepository,
    audit: AuditRepository,
    privateStorage: FileStorage,
  ) {
    this.brands = brands;
    this.users = users;
    this.audit = audit;
    this.privateStorage = privateStorage;
  }

  async getForOwner(userId: string): Promise<BrandOwnerDto> {
    const brand = await this.brands.findByUserId(userId);
    if (!brand) {
      throw ApiError.profileNotFound('Bạn chưa có hồ sơ brand. Hãy tạo hồ sơ trước.');
    }
    return toBrandOwnerDto(brand);
  }

  /**
   * Upsert theo transition matrix (BRD-001, BRD-004):
   * chưa có → draft; verified → pending_review (sửa sau duyệt phải duyệt lại);
   * pending_review/suspended → 409; draft/rejected/info_required → update giữ status.
   */
  async createOrUpdateProfile(userId: string, input: BrandProfileInput): Promise<BrandOwnerDto> {
    const existing = await this.brands.findByUserId(userId);
    if (!existing) {
      const created = await this.brands.create(this.buildNewBrand(userId, input));
      return toBrandOwnerDto(created);
    }

    if (existing.status === 'pending_review' || existing.status === 'suspended') {
      throw ApiError.profileLocked();
    }

    const nextStatus: BrandStatus =
      existing.status === 'verified' ? 'pending_review' : existing.status;
    const updated = await this.applyUpdate(existing.id, {
      ...existing,
      ...this.toProfileFields(input),
      status: nextStatus,
    });
    return toBrandOwnerDto(updated);
  }

  /** Upload giấy tờ xác minh vào storage private (BRD-003). */
  async uploadVerificationDoc(userId: string, file: UploadedDocInput): Promise<BrandOwnerDto> {
    const brand = await this.requireOwnerBrand(userId);
    if (brand.status === 'suspended') {
      throw ApiError.profileLocked();
    }

    const stored = await this.privateStorage.put({
      originalName: file.originalName,
      mimeType: file.mimeType,
      size: file.size,
      buffer: file.buffer,
    });

    const updated = await this.brands.addVerificationDoc(brand.id, {
      id: `doc_${randomUUID().replaceAll('-', '')}`,
      fileName: file.originalName,
      storageKey: stored.key,
      uploadedAt: new Date().toISOString(),
    });
    if (!updated) {
      throw ApiError.internal('Không tìm thấy hồ sơ để cập nhật.');
    }
    return toBrandOwnerDto(updated);
  }

  /** Gửi duyệt (BRD-004): cần ≥1 giấy tờ xác minh; audit append-only. */
  async submitForReview(userId: string): Promise<BrandOwnerDto> {
    const brand = await this.requireOwnerBrand(userId);
    if (
      brand.status !== 'draft' &&
      brand.status !== 'rejected' &&
      brand.status !== 'info_required'
    ) {
      throw ApiError.profileLocked();
    }
    if (brand.verificationDocs.length === 0) {
      throw ApiError.profileIncomplete(
        'Cần upload ít nhất một giấy tờ xác minh trước khi gửi duyệt.',
      );
    }

    const updated = await this.applyUpdate(brand.id, { ...brand, status: 'pending_review' });
    await this.audit.create({
      actorId: userId,
      action: 'brand.submit',
      targetType: 'brand',
      targetId: brand.id,
      before: brand.status,
      after: updated.status,
      reason: null,
    });
    return toBrandOwnerDto(updated);
  }

  /** Đọc file giấy tờ — CHỈ admin hoặc chính chủ (BRD-003, SEC-003). */
  async getVerificationDoc(
    requesterUserId: string,
    requesterRole: string,
    brandId: string,
    docId: string,
  ): Promise<BrandDocFile> {
    const brand = await this.brands.findById(brandId);
    if (!brand) {
      throw ApiError.notFound('Không tìm thấy brand này.');
    }
    if (requesterRole !== 'admin' && brand.userId !== requesterUserId) {
      throw ApiError.forbidden();
    }

    const doc = brand.verificationDocs.find((item) => item.id === docId);
    if (!doc) {
      throw ApiError.notFound('Không tìm thấy tài liệu này.');
    }
    const buffer = await this.privateStorage.read(doc.storageKey);
    if (!buffer) {
      throw ApiError.notFound('File không còn tồn tại trong kho lưu trữ.');
    }

    const extension = doc.storageKey.slice(doc.storageKey.lastIndexOf('.'));
    return {
      buffer,
      mimeType: DOC_MIME_BY_EXTENSION[extension] ?? 'application/octet-stream',
      fileName: doc.fileName,
    };
  }

  /** Admin queue theo trạng thái (BRD-007). */
  async listQueue(status: BrandStatus, page: number, limit: number): Promise<BrandReviewPage> {
    const brands = await this.brands.findByStatus([status]);
    const pageItems = brands.slice((page - 1) * limit, page * limit);
    const items = await Promise.all(
      pageItems.map(async (brand) => toBrandAdminDto(brand, await this.resolveUserEmail(brand))),
    );
    return { items, total: brands.length, page, limit };
  }

  /** Admin duyệt hồ sơ brand — mirror creator-review, có audit (BRD-007). */
  async review(
    adminUserId: string,
    brandId: string,
    action: BrandReviewAction,
    reason?: string,
  ): Promise<BrandAdminDto> {
    const brand = await this.brands.findById(brandId);
    if (!brand) {
      throw ApiError.notFound('Không tìm thấy brand này.');
    }

    const normalizedReason = reason?.trim();
    if (ACTIONS_REQUIRING_REASON.includes(action) && !normalizedReason) {
      throw ApiError.badRequest('reason bắt buộc khi reject/request_info/suspend.');
    }

    const allowedFrom = ALLOWED_FROM_BY_ACTION[action];
    if (!allowedFrom.includes(brand.status)) {
      throw ApiError.conflict(`Không thể ${action} hồ sơ đang ở trạng thái ${brand.status}.`);
    }

    const saved = await this.applyUpdate(brandId, {
      ...brand,
      status: NEXT_STATUS_BY_ACTION[action],
      statusReason: ACTIONS_REQUIRING_REASON.includes(action) ? (normalizedReason ?? null) : null,
    });

    await this.audit.create({
      actorId: adminUserId,
      action: `brand.review.${action}`,
      targetType: 'brand',
      targetId: brandId,
      before: brand.status,
      after: saved.status,
      reason: normalizedReason ?? null,
    });

    return toBrandAdminDto(saved, await this.resolveUserEmail(saved));
  }

  private async requireOwnerBrand(userId: string): Promise<Brand> {
    const brand = await this.brands.findByUserId(userId);
    if (!brand) {
      throw ApiError.profileNotFound('Bạn chưa có hồ sơ brand. Hãy tạo hồ sơ trước.');
    }
    return brand;
  }

  private async applyUpdate(id: string, next: Brand): Promise<Brand> {
    const updated = await this.brands.update(id, next);
    if (!updated) {
      throw ApiError.internal('Không tìm thấy hồ sơ để cập nhật.');
    }
    return updated;
  }

  private async resolveUserEmail(brand: Brand): Promise<string> {
    const user = await this.users.findById(brand.userId);
    return user?.email ?? '';
  }

  private buildNewBrand(userId: string, input: BrandProfileInput): Brand {
    return {
      id: '', // repository sinh brd_ + uuid
      userId,
      ...this.toProfileFields(input),
      status: 'draft',
      statusReason: null,
      verificationDocs: [],
      createdAt: new Date().toISOString(),
    };
  }

  private toProfileFields(
    input: BrandProfileInput,
  ): Pick<
    Brand,
    | 'name'
    | 'logoUrl'
    | 'industry'
    | 'website'
    | 'socialLinks'
    | 'businessAddress'
    | 'entityType'
    | 'contact'
  > {
    return {
      name: input.name,
      logoUrl: input.logoUrl ?? null,
      industry: input.industry,
      website: input.website ?? null,
      socialLinks: input.socialLinks,
      businessAddress: input.businessAddress,
      entityType: input.entityType,
      contact: input.contact,
    };
  }
}
