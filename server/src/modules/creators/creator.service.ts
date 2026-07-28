import { ApiError } from '../../shared/errors/api-error.js';
import type { CreatorRepository } from './creator.repository.js';
import { toCreatorPublicDto } from './creator.mapper.js';
import type { CreatorListFilter, CreatorPublicDto } from './creator.types.js';

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
}
