import { ApiError } from '../../shared/errors/api-error.js';
import type { CreatorRepository } from './creator.repository.js';
import { toCreatorOwnerDto, toCreatorPublicDto } from './creator.mapper.js';
import type {
  AvailabilityUpdate,
  Creator,
  CreatorListFilter,
  CreatorOwnerDto,
  CreatorProfileInput,
  CreatorPublicDto,
} from './creator.types.js';

export interface CreatorListPage {
  readonly items: readonly CreatorPublicDto[];
  readonly total: number;
  readonly page: number;
  readonly limit: number;
}

/**
 * Service layer: business rules cho discovery công khai.
 * Chỉ creator "verified" được hiển thị (BR-001); output luôn là public DTO.
 */
export class CreatorService {
  private readonly repository: CreatorRepository;

  constructor(repository: CreatorRepository) {
    this.repository = repository;
  }

  async listPublicCreators(filter: CreatorListFilter): Promise<CreatorListPage> {
    const { items, total } = await this.repository.findAll(filter);
    return {
      items: items.map(toCreatorPublicDto),
      total,
      page: filter.page,
      limit: filter.limit,
    };
  }

  async getPublicCreatorById(id: string): Promise<CreatorPublicDto> {
    const creator = await this.repository.findById(id);
    if (!creator || creator.status !== 'verified') {
      throw ApiError.notFound('Không tìm thấy creator này.');
    }
    return toCreatorPublicDto(creator);
  }

  /** Hồ sơ của chính chủ — 404 khi chưa có (client redirect onboarding, CRE-001). */
  async getProfileForOwner(userId: string): Promise<CreatorOwnerDto> {
    const creator = await this.repository.findByUserId(userId);
    if (!creator) {
      throw ApiError.profileNotFound();
    }
    return toCreatorOwnerDto(creator);
  }

  /**
   * Upsert hồ sơ theo transition matrix (CRE-001, CRE-002, CRE-007):
   * chưa có → draft; verified → pending_review (chỉnh sau duyệt phải duyệt lại);
   * pending_review/suspended → 409; draft/rejected/info_required → update giữ status.
   */
  async createOrUpdateProfile(userId: string, input: CreatorProfileInput): Promise<CreatorOwnerDto> {
    const existing = await this.repository.findByUserId(userId);
    if (!existing) {
      const created = await this.repository.create(this.buildNewCreator(userId, input));
      return toCreatorOwnerDto(created);
    }

    if (existing.status === 'verified') {
      const updated = await this.applyUpdate(existing.id, {
        ...this.toUpdatePatch(existing, input),
        status: 'pending_review',
      });
      return toCreatorOwnerDto(updated);
    }

    if (existing.status === 'pending_review' || existing.status === 'suspended') {
      throw ApiError.profileLocked();
    }

    const updated = await this.applyUpdate(existing.id, this.toUpdatePatch(existing, input));
    return toCreatorOwnerDto(updated);
  }

  /** Gửi duyệt: draft/rejected/info_required → pending_review; hồ sơ thiếu dữ liệu → 400 (CRE-001). */
  async submitForReview(userId: string): Promise<CreatorOwnerDto> {
    const creator = await this.repository.findByUserId(userId);
    if (!creator) {
      throw ApiError.profileNotFound();
    }
    if (
      creator.status !== 'draft' &&
      creator.status !== 'rejected' &&
      creator.status !== 'info_required'
    ) {
      throw ApiError.profileLocked();
    }

    const isIncomplete =
      !creator.avatarUrl ||
      creator.bio.trim().length === 0 ||
      creator.displayName.trim().length === 0 ||
      creator.city.trim().length === 0 ||
      creator.niches.length === 0;
    if (isIncomplete) {
      throw ApiError.profileIncomplete();
    }

    const updated = await this.applyUpdate(creator.id, { ...creator, status: 'pending_review' });
    return toCreatorOwnerDto(updated);
  }

  /** Cập nhật lịch nhận việc — mọi trạng thái trừ suspended (CRE-010). */
  async updateAvailability(userId: string, input: AvailabilityUpdate): Promise<CreatorOwnerDto> {
    const creator = await this.repository.findByUserId(userId);
    if (!creator) {
      throw ApiError.profileNotFound();
    }
    if (creator.status === 'suspended') {
      throw ApiError.profileLocked();
    }

    const updated = await this.applyUpdate(creator.id, { ...creator, availability: input });
    return toCreatorOwnerDto(updated);
  }

  private async applyUpdate(id: string, next: Creator): Promise<Creator> {
    const updated = await this.repository.update(id, next);
    if (!updated) {
      throw ApiError.internal('Không tìm thấy hồ sơ để cập nhật.');
    }
    return updated;
  }

  private buildNewCreator(userId: string, input: CreatorProfileInput): Creator {
    return {
      id: '', // repository tự sinh id (crt_ + uuid) khi create.
      userId,
      displayName: input.displayName,
      avatarUrl: input.avatarUrl ?? null,
      bio: input.bio,
      city: input.city,
      niches: input.niches,
      language: input.language,
      creatorType: input.creatorType,
      status: 'draft',
      statusReason: null,
      socialAccounts: input.socialAccounts,
      audienceMetrics: input.audienceMetrics,
      serviceMode: input.serviceMode,
      availability: { availableDays: [], isPaused: false },
      portfolioItems: [],
      priceFromVnd: 0,
      rating: 0,
      completedBookings: 0,
      createdAt: new Date().toISOString(),
    };
  }

  private toUpdatePatch(existing: Creator, input: CreatorProfileInput): Creator {
    return {
      ...existing,
      displayName: input.displayName,
      avatarUrl: input.avatarUrl ?? null,
      bio: input.bio,
      city: input.city,
      niches: input.niches,
      language: input.language,
      creatorType: input.creatorType,
      socialAccounts: input.socialAccounts,
      audienceMetrics: input.audienceMetrics,
      serviceMode: input.serviceMode,
    };
  }
}
