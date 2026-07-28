import type { Request, Response } from 'express';
import { buildPaginationMeta, sendOk } from '../../shared/http/api-response.js';
import { getValidatedParams, getValidatedQuery } from '../../shared/middlewares/validate.js';
import type { CreatorService } from './creator.service.js';
import type { CreatorIdParams, CreatorListQuery } from './creator.validation.js';
import type { CreatorListFilter } from './creator.types.js';

const toListFilter = (query: CreatorListQuery): CreatorListFilter => ({
  ...(query.search !== undefined ? { search: query.search } : {}),
  ...(query.city !== undefined ? { city: query.city } : {}),
  ...(query.creatorType !== undefined ? { creatorType: query.creatorType } : {}),
  ...(query.platform !== undefined ? { platform: query.platform } : {}),
  ...(query.minPrice !== undefined ? { minPriceVnd: query.minPrice } : {}),
  ...(query.maxPrice !== undefined ? { maxPriceVnd: query.maxPrice } : {}),
  sort: query.sort,
  page: query.page,
  limit: query.limit,
});

/** Controller layer: chỉ đọc input đã validate, gọi service và trả envelope. */
export class CreatorController {
  private readonly service: CreatorService;

  constructor(service: CreatorService) {
    this.service = service;
  }

  list = async (_req: Request, res: Response): Promise<void> => {
    const query = getValidatedQuery<CreatorListQuery>(res);
    const result = await this.service.listPublicCreators(toListFilter(query));
    sendOk(res, result.items, buildPaginationMeta(result.page, result.limit, result.total));
  };

  getById = async (_req: Request, res: Response): Promise<void> => {
    const params = getValidatedParams<CreatorIdParams>(res);
    const creator = await this.service.getPublicCreatorById(params.id);
    sendOk(res, creator);
  };
}
