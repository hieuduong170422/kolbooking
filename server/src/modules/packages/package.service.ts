import { randomUUID } from 'node:crypto';
import { ApiError } from '../../shared/errors/api-error.js';
import type { AuditRepository } from '../audit/audit.repository.js';
import type { CreatorRepository } from '../creators/creator.repository.js';
import type { Creator } from '../creators/creator.types.js';
import { toPackageOwnerDto, toPackagePublicDto } from './package.mapper.js';
import type { PackageRepository } from './package.repository.js';
import type {
  PackageInput,
  PackageOwnerDto,
  PackagePublicDto,
  ServicePackage,
} from './package.types.js';

export interface PackageListPage {
  readonly items: readonly PackagePublicDto[];
  readonly total: number;
  readonly page: number;
  readonly limit: number;
}

/**
 * Business rules service package (PKG-001..PKG-008, PKG-010):
 * - Chỉ creator Verified mới publish (BR-001); admin ẩn package vi phạm có audit.
 * - Sửa package đã publish tăng version — booking giữ snapshot theo version (PKG-008).
 * - priceFromVnd của creator = giá thấp nhất trong các package published.
 */
export class PackageService {
  private readonly packages: PackageRepository;
  private readonly creators: CreatorRepository;
  private readonly audit: AuditRepository;

  constructor(
    packages: PackageRepository,
    creators: CreatorRepository,
    audit: AuditRepository,
  ) {
    this.packages = packages;
    this.creators = creators;
    this.audit = audit;
  }

  /** Public: danh sách package published của một creator verified. */
  async listPublicByCreator(
    creatorId: string,
    page: number,
    limit: number,
  ): Promise<PackageListPage> {
    const creator = await this.creators.findById(creatorId);
    if (!creator || creator.status !== 'verified') {
      throw ApiError.notFound('Không tìm thấy creator này.');
    }
    const { items, total } = await this.packages.findPublishedByCreator({
      creatorId,
      page,
      limit,
    });
    return { items: items.map(toPackagePublicDto), total, page, limit };
  }

  /** Public: chi tiết package — chỉ package published của creator verified. */
  async getPublicById(id: string): Promise<PackagePublicDto> {
    const pkg = await this.packages.findById(id);
    if (!pkg || pkg.status !== 'published') {
      throw ApiError.notFound('Không tìm thấy package này.');
    }
    const creator = await this.creators.findById(pkg.creatorId);
    if (!creator || creator.status !== 'verified') {
      throw ApiError.notFound('Không tìm thấy package này.');
    }
    return toPackagePublicDto(pkg);
  }

  async listForOwner(userId: string): Promise<readonly PackageOwnerDto[]> {
    const creator = await this.requireOwnerCreator(userId);
    const items = await this.packages.findAllByCreator(creator.id);
    return items.map(toPackageOwnerDto);
  }

  /** Tạo package mới ở trạng thái draft (PKG-001). */
  async create(userId: string, input: PackageInput): Promise<PackageOwnerDto> {
    const creator = await this.requireOwnerCreator(userId);
    const now = new Date().toISOString();
    const created = await this.packages.create({
      id: '', // repository sinh pkg_ + uuid
      creatorId: creator.id,
      ...this.toPackageFields(input),
      status: 'draft',
      statusReason: null,
      version: 1,
      createdAt: now,
      updatedAt: now,
    });
    return toPackageOwnerDto(created);
  }

  /**
   * Sửa package (PKG-008): draft/unpublished giữ nguyên version;
   * published tăng version (booking cũ giữ snapshot); hidden bị khóa.
   */
  async update(userId: string, packageId: string, input: PackageInput): Promise<PackageOwnerDto> {
    const { pkg } = await this.requireOwnedPackage(userId, packageId);
    if (pkg.status === 'hidden') {
      throw ApiError.conflict('Package đã bị ẩn bởi quản trị viên, không thể chỉnh sửa.');
    }

    const updated = await this.applyUpdate(packageId, {
      ...pkg,
      ...this.toPackageFields(input),
      version: pkg.status === 'published' ? pkg.version + 1 : pkg.version,
      updatedAt: new Date().toISOString(),
    });
    if (pkg.status === 'published') {
      await this.refreshCreatorPriceFrom(pkg.creatorId);
    }
    return toPackageOwnerDto(updated);
  }

  /** Publish (PKG-007, BR-001): chỉ khi creator Verified; từ draft/unpublished. */
  async publish(userId: string, packageId: string): Promise<PackageOwnerDto> {
    const { pkg, creator } = await this.requireOwnedPackage(userId, packageId);
    if (creator.status !== 'verified') {
      throw ApiError.conflict(
        'Hồ sơ creator chưa được duyệt — chỉ creator Verified mới publish package (BR-001).',
      );
    }
    if (pkg.status !== 'draft' && pkg.status !== 'unpublished') {
      throw ApiError.conflict(`Không thể publish package đang ở trạng thái ${pkg.status}.`);
    }

    const updated = await this.applyUpdate(packageId, {
      ...pkg,
      status: 'published',
      statusReason: null,
      updatedAt: new Date().toISOString(),
    });
    await this.refreshCreatorPriceFrom(pkg.creatorId);
    return toPackageOwnerDto(updated);
  }

  /** Gỡ bán (PKG-007) — không ảnh hưởng booking đã xác nhận (booking giữ snapshot). */
  async unpublish(userId: string, packageId: string): Promise<PackageOwnerDto> {
    const { pkg } = await this.requireOwnedPackage(userId, packageId);
    if (pkg.status !== 'published') {
      throw ApiError.conflict(`Không thể gỡ package đang ở trạng thái ${pkg.status}.`);
    }

    const updated = await this.applyUpdate(packageId, {
      ...pkg,
      status: 'unpublished',
      updatedAt: new Date().toISOString(),
    });
    await this.refreshCreatorPriceFrom(pkg.creatorId);
    return toPackageOwnerDto(updated);
  }

  /** Xóa cứng chỉ cho draft — package đã publish thì gỡ bán thay vì xóa (BR-015). */
  async deleteDraft(userId: string, packageId: string): Promise<void> {
    const { pkg } = await this.requireOwnedPackage(userId, packageId);
    if (pkg.status !== 'draft') {
      throw ApiError.conflict('Chỉ xóa được package ở trạng thái draft. Hãy gỡ bán thay vì xóa.');
    }
    await this.packages.delete(packageId);
  }

  /** Admin ẩn package vi phạm — reason bắt buộc, có audit (PKG-010). */
  async hide(adminUserId: string, packageId: string, reason: string): Promise<PackageOwnerDto> {
    const pkg = await this.requirePackage(packageId);
    if (pkg.status === 'hidden') {
      throw ApiError.conflict('Package đã ở trạng thái ẩn.');
    }

    const updated = await this.applyUpdate(packageId, {
      ...pkg,
      status: 'hidden',
      statusReason: reason,
      updatedAt: new Date().toISOString(),
    });
    await this.audit.create({
      actorId: adminUserId,
      action: 'package.hide',
      targetType: 'package',
      targetId: packageId,
      before: pkg.status,
      after: 'hidden',
      reason,
    });
    await this.refreshCreatorPriceFrom(pkg.creatorId);
    return toPackageOwnerDto(updated);
  }

  /** Admin khôi phục — về unpublished, creator chủ động publish lại (PKG-010). */
  async unhide(adminUserId: string, packageId: string): Promise<PackageOwnerDto> {
    const pkg = await this.requirePackage(packageId);
    if (pkg.status !== 'hidden') {
      throw ApiError.conflict('Package không ở trạng thái ẩn.');
    }

    const updated = await this.applyUpdate(packageId, {
      ...pkg,
      status: 'unpublished',
      statusReason: null,
      updatedAt: new Date().toISOString(),
    });
    await this.audit.create({
      actorId: adminUserId,
      action: 'package.unhide',
      targetType: 'package',
      targetId: packageId,
      before: 'hidden',
      after: 'unpublished',
      reason: null,
    });
    return toPackageOwnerDto(updated);
  }

  private async requireOwnerCreator(userId: string): Promise<Creator> {
    const creator = await this.creators.findByUserId(userId);
    if (!creator) {
      throw ApiError.profileNotFound();
    }
    return creator;
  }

  private async requirePackage(packageId: string): Promise<ServicePackage> {
    const pkg = await this.packages.findById(packageId);
    if (!pkg) {
      throw ApiError.notFound('Không tìm thấy package này.');
    }
    return pkg;
  }

  /** Object-level authorization (SEC-003): package phải thuộc creator của user. */
  private async requireOwnedPackage(
    userId: string,
    packageId: string,
  ): Promise<{ pkg: ServicePackage; creator: Creator }> {
    const creator = await this.requireOwnerCreator(userId);
    const pkg = await this.requirePackage(packageId);
    if (pkg.creatorId !== creator.id) {
      throw ApiError.forbidden();
    }
    return { pkg, creator };
  }

  private async applyUpdate(id: string, next: ServicePackage): Promise<ServicePackage> {
    const updated = await this.packages.update(id, next);
    if (!updated) {
      throw ApiError.internal('Không tìm thấy package để cập nhật.');
    }
    return updated;
  }

  /** priceFromVnd của creator = giá thấp nhất trong package published (0 nếu chưa có). */
  private async refreshCreatorPriceFrom(creatorId: string): Promise<void> {
    const creator = await this.creators.findForReviewById(creatorId);
    if (!creator) return;
    const { items } = await this.packages.findPublishedByCreator({
      creatorId,
      page: 1,
      limit: 1,
    });
    const priceFromVnd = items[0]?.priceVnd ?? 0;
    if (priceFromVnd !== creator.priceFromVnd) {
      await this.creators.update(creatorId, { ...creator, priceFromVnd });
    }
  }

  private toPackageFields(
    input: PackageInput,
  ): Omit<
    ServicePackage,
    'id' | 'creatorId' | 'status' | 'statusReason' | 'version' | 'createdAt' | 'updatedAt'
  > {
    return {
      name: input.name,
      category: input.category,
      platforms: input.platforms,
      description: input.description,
      coverImageUrl: input.coverImageUrl ?? null,
      deliverables: input.deliverables,
      priceVnd: input.priceVnd,
      turnaroundDays: input.turnaroundDays,
      revisionsIncluded: input.revisionsIncluded,
      usageRights: input.usageRights,
      postDurationDays: input.postDurationDays ?? null,
      addOns: input.addOns.map((addOn) => ({
        ...addOn,
        id: `ado_${randomUUID().replaceAll('-', '')}`,
      })),
    };
  }
}
