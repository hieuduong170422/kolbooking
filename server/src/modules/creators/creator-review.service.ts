import { ApiError } from '../../shared/errors/api-error.js';
import type { AuditRepository } from '../audit/audit.repository.js';
import type { UserRepository } from '../users/user.repository.js';
import type { ReviewAction } from './creator-review.validation.js';
import type { CreatorRepository } from './creator.repository.js';
import type { Creator, CreatorAdminDto, CreatorStatus } from './creator.types.js';

export interface CreatorReviewPage {
  readonly items: readonly CreatorAdminDto[];
  readonly total: number;
  readonly page: number;
  readonly limit: number;
}

const ACTIONS_REQUIRING_REASON: readonly ReviewAction[] = ['reject', 'request_info', 'suspend'];

/** admin duyệt chỉ nhận input mới — creator rỗng coi là không có email gốc. */
const USER_EMAIL_FALLBACK = '';

const toCreatorAdminDto = (creator: Creator, userEmail: string): CreatorAdminDto => ({
  id: creator.id,
  displayName: creator.displayName,
  avatarUrl: creator.avatarUrl,
  bio: creator.bio,
  city: creator.city,
  niches: creator.niches,
  language: creator.language,
  creatorType: creator.creatorType,
  socialAccounts: creator.socialAccounts,
  status: creator.status,
  statusReason: creator.statusReason,
  audienceMetrics: creator.audienceMetrics,
  serviceMode: creator.serviceMode,
  availability: creator.availability,
  portfolioItems: creator.portfolioItems,
  priceFromVnd: creator.priceFromVnd,
  rating: creator.rating,
  completedBookings: creator.completedBookings,
  createdAt: creator.createdAt,
  userEmail,
});

/** Trạng thái đích của từng action — máy trạng thái duyệt hồ sơ (CRE-008). */
const NEXT_STATUS_BY_ACTION: Record<ReviewAction, CreatorStatus> = {
  approve: 'verified',
  reject: 'rejected',
  request_info: 'info_required',
  suspend: 'suspended',
};

/** Trạng thái nguồn hợp lệ — ngoài ra trả 409 (guard idempotency + sai trạng thái). */
const ALLOWED_FROM_BY_ACTION: Record<ReviewAction, readonly CreatorStatus[]> = {
  approve: ['pending_review'],
  reject: ['pending_review'],
  request_info: ['pending_review'],
  suspend: ['verified'],
};

/**
 * Service layer: admin review queue + máy trạng thái duyệt hồ sơ (CRE-008).
 * Mọi action đều ghi audit append-only; output là CreatorAdminDto (kèm userEmail).
 */
export class ReviewService {
  private readonly creatorRepository: CreatorRepository;
  private readonly userRepository: UserRepository;
  private readonly auditRepository: AuditRepository;

  constructor(
    creatorRepository: CreatorRepository,
    userRepository: UserRepository,
    auditRepository: AuditRepository,
  ) {
    this.creatorRepository = creatorRepository;
    this.userRepository = userRepository;
    this.auditRepository = auditRepository;
  }

  async listQueue(status: CreatorStatus, page: number, limit: number): Promise<CreatorReviewPage> {
    const creators = await this.creatorRepository.findByStatusForReview([status]);
    const pageItems = creators.slice((page - 1) * limit, page * limit);
    const items = await Promise.all(
      pageItems.map(async (creator) =>
        toCreatorAdminDto(creator, await this.resolveUserEmail(creator)),
      ),
    );
    return { items, total: creators.length, page, limit };
  }

  async review(
    adminUserId: string,
    creatorId: string,
    action: ReviewAction,
    reason?: string,
  ): Promise<CreatorAdminDto> {
    const creator = await this.creatorRepository.findForReviewById(creatorId);
    if (!creator) {
      throw ApiError.notFound('Không tìm thấy creator này.');
    }

    const normalizedReason = reason?.trim();
    if (ACTIONS_REQUIRING_REASON.includes(action) && !normalizedReason) {
      throw ApiError.badRequest('reason bắt buộc khi reject/request_info/suspend.');
    }

    const allowedFrom = ALLOWED_FROM_BY_ACTION[action];
    if (!allowedFrom.includes(creator.status)) {
      throw ApiError.conflict(
        `Không thể ${action} hồ sơ đang ở trạng thái ${creator.status}.`,
      );
    }

    const nextStatus = NEXT_STATUS_BY_ACTION[action];
    const updated: Creator = {
      ...creator,
      status: nextStatus,
      statusReason: ACTIONS_REQUIRING_REASON.includes(action) ? normalizedReason ?? null : null,
    };
    const saved = await this.creatorRepository.update(creatorId, updated);
    if (!saved) {
      throw ApiError.notFound('Không tìm thấy creator này.');
    }

    await this.auditRepository.create({
      actorId: adminUserId,
      action: `creator.review.${action}`,
      targetType: 'creator',
      targetId: creatorId,
      before: creator.status,
      after: saved.status,
      reason: normalizedReason ?? null,
    });

    return toCreatorAdminDto(saved, await this.resolveUserEmail(saved));
  }

  /** userEmail lấy từ user gốc; userId null (seed không liên kết) → chuỗi rỗng. */
  private async resolveUserEmail(creator: Creator): Promise<string> {
    if (!creator.userId) return USER_EMAIL_FALLBACK;
    const user = await this.userRepository.findById(creator.userId);
    return user?.email ?? USER_EMAIL_FALLBACK;
  }
}
