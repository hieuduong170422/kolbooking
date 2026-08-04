import type { Request, Response } from 'express';
import { getAuthUser } from '../auth/auth.middleware.js';
import { buildPaginationMeta, sendOk } from '../../shared/http/api-response.js';
import { getValidatedBody, getValidatedParams, getValidatedQuery } from '../../shared/middlewares/validate.js';
import type { ReviewActionBody, ReviewParams, ReviewQuery } from './creator-review.validation.js';
import type { ReviewService } from './creator-review.service.js';

/** Controller layer: đọc input đã validate, gọi service và trả envelope. */
export class CreatorReviewController {
  private readonly service: ReviewService;

  constructor(service: ReviewService) {
    this.service = service;
  }

  listQueue = async (_req: Request, res: Response): Promise<void> => {
    const query = getValidatedQuery<ReviewQuery>(res);
    const result = await this.service.listQueue(query.status, query.page, query.limit);
    sendOk(res, result.items, buildPaginationMeta(result.page, result.limit, result.total));
  };

  review = async (_req: Request, res: Response): Promise<void> => {
    const params = getValidatedParams<ReviewParams>(res);
    const body = getValidatedBody<ReviewActionBody>(res);
    const authUser = getAuthUser(res);
    const creator = await this.service.review(authUser.userId, params.id, body.action, body.reason);
    sendOk(res, creator);
  };
}
