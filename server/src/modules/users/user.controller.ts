import type { Request, Response } from 'express';
import { buildPaginationMeta, sendOk } from '../../shared/http/api-response.js';
import { getValidatedBody, getValidatedParams, getValidatedQuery } from '../../shared/middlewares/validate.js';
import { getAuthUser } from '../auth/auth.middleware.js';
import type { UserAdminService } from './user.service.js';
import type { LockUserBody, UserIdParams, UserListQuery } from './user.validation.js';

export class UserAdminController {
  private readonly service: UserAdminService;

  constructor(service: UserAdminService) {
    this.service = service;
  }

  list = async (_req: Request, res: Response): Promise<void> => {
    const query = getValidatedQuery<UserListQuery>(res);
    const result = await this.service.list(query);
    sendOk(res, result.items, buildPaginationMeta(result.page, result.limit, result.total));
  };

  lock = async (_req: Request, res: Response): Promise<void> => {
    const admin = getAuthUser(res);
    const params = getValidatedParams<UserIdParams>(res);
    const body = getValidatedBody<LockUserBody>(res);
    const user = await this.service.lock(admin.userId, params.id, body.reason);
    sendOk(res, { user });
  };

  unlock = async (_req: Request, res: Response): Promise<void> => {
    const admin = getAuthUser(res);
    const params = getValidatedParams<UserIdParams>(res);
    const user = await this.service.unlock(admin.userId, params.id);
    sendOk(res, { user });
  };
}
