import type {
  Creator,
  CreatorListFilter,
  CreatorListResult,
  CreatorStatus,
  PortfolioItem,
} from './creator.types.js';

/**
 * Repository Pattern: business logic chỉ phụ thuộc interface này.
 * MVP dùng InMemoryCreatorRepository; khi có PostgreSQL chỉ cần
 * thêm implementation mới mà không đổi service/controller.
 */
export interface CreatorRepository {
  findAll(filter: CreatorListFilter): Promise<CreatorListResult>;
  findById(id: string): Promise<Creator | null>;
  /** Tìm hồ sơ theo user sở hữu — null khi chưa có profile (CRE-001). */
  findByUserId(userId: string): Promise<Creator | null>;
  /** Tạo hồ sơ mới — id do repository sinh (crt_ + uuid), trả bản copy (CRE-001). */
  create(input: Creator): Promise<Creator>;
  /** Full replace hồ sơ theo id — null khi không tồn tại; trả bản copy (CRE-002). */
  update(id: string, input: Creator): Promise<Creator | null>;
  /** Admin queue — trả creator khớp BẤT KỲ status nào, KHÔNG lọc verified-only (CRE-008). */
  findByStatusForReview(statuses: readonly CreatorStatus[]): Promise<readonly Creator[]>;
  /** Admin xem chi tiết để duyệt — bỏ qua BR-001 verified-only (CRE-008). */
  findForReviewById(id: string): Promise<Creator | null>;
  /** Thêm mục portfolio vào cuối danh sách — null khi creator không tồn tại (CRE-004). */
  addPortfolioItem(creatorId: string, item: PortfolioItem): Promise<Creator | null>;
  /** Xóa mục portfolio theo itemId — null khi creator không tồn tại (CRE-004). */
  removePortfolioItem(creatorId: string, itemId: string): Promise<Creator | null>;
}
