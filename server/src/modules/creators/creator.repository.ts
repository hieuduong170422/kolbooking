import type { Creator, CreatorListFilter, CreatorListResult } from './creator.types.js';

/**
 * Repository Pattern: business logic chỉ phụ thuộc interface này.
 * MVP dùng InMemoryCreatorRepository; khi có PostgreSQL chỉ cần
 * thêm implementation mới mà không đổi service/controller.
 */
export interface CreatorRepository {
  findAll(filter: CreatorListFilter): Promise<CreatorListResult>;
  findById(id: string): Promise<Creator | null>;
}
