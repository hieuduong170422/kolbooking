import type { Request, Response } from 'express';
import { buildPaginationMeta, sendOk } from '../../shared/http/api-response.js';
import { getValidatedBody, getValidatedParams, getValidatedQuery } from '../../shared/middlewares/validate.js';
import { getAuthUser } from '../auth/auth.middleware.js';
import type { CreatorService } from './creator.service.js';
import type { CreatorIdParams, CreatorListQuery } from './creator.validation.js';
import type { CreatorListFilter } from './creator.types.js';
import type { AvailabilityUpdate, CreatorProfileInput } from './creator.types.js';

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

  /** GET /creators/me — hồ sơ của chính creator đang đăng nhập (CRE-001). */
  getMe = async (_req: Request, res: Response): Promise<void> => {
    const authUser = getAuthUser(res);
    const profile = await this.service.getProfileForOwner(authUser.userId);
    sendOk(res, profile);
  };

  /** PUT /creators/me — upsert hồ sơ theo transition matrix (CRE-002, CRE-007). */
  updateMe = async (_req: Request, res: Response): Promise<void> => {
    const authUser = getAuthUser(res);
    const body = getValidatedBody<CreatorProfileInput>(res);
    const profile = await this.service.createOrUpdateProfile(authUser.userId, body);
    sendOk(res, profile);
  };

  /** POST /creators/me/submit-review — gửi hồ sơ chờ admin duyệt (CRE-001). */
  submitForReview = async (_req: Request, res: Response): Promise<void> => {
    const authUser = getAuthUser(res);
    const profile = await this.service.submitForReview(authUser.userId);
    sendOk(res, profile);
  };

  /** PATCH /creators/me/availability — cập nhật lịch nhận việc (CRE-010). */
  updateAvailability = async (_req: Request, res: Response): Promise<void> => {
    const authUser = getAuthUser(res);
    const body = getValidatedBody<AvailabilityUpdate>(res);
    const profile = await this.service.updateAvailability(authUser.userId, body);
    sendOk(res, profile);
  };
}
