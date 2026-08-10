import type { Request, Response } from 'express';
import { buildPaginationMeta, sendCreated, sendOk } from '../../shared/http/api-response.js';
import {
  getValidatedBody,
  getValidatedParams,
  getValidatedQuery,
} from '../../shared/middlewares/validate.js';
import { getAuthUser } from '../auth/auth.middleware.js';
import type { PackageService } from './package.service.js';
import type {
  PackageAdminQuery,
  PackageBody,
  PackageHideBody,
  PackageIdParams,
  PackageListQuery,
} from './package.validation.js';

export class PackageController {
  private readonly service: PackageService;

  constructor(service: PackageService) {
    this.service = service;
  }

  listPublic = async (_req: Request, res: Response): Promise<void> => {
    const query = getValidatedQuery<PackageListQuery>(res);
    const result = await this.service.listPublicByCreator(query.creatorId, query.page, query.limit);
    sendOk(res, result.items, buildPaginationMeta(result.page, result.limit, result.total));
  };

  getPublicById = async (_req: Request, res: Response): Promise<void> => {
    const params = getValidatedParams<PackageIdParams>(res);
    const pkg = await this.service.getPublicById(params.id);
    sendOk(res, { package: pkg });
  };

  listForAdmin = async (_req: Request, res: Response): Promise<void> => {
    const query = getValidatedQuery<PackageAdminQuery>(res);
    const result = await this.service.listForAdmin(query);
    sendOk(res, result.items, buildPaginationMeta(result.page, result.limit, result.total));
  };

  listMine = async (_req: Request, res: Response): Promise<void> => {
    const authUser = getAuthUser(res);
    const items = await this.service.listForOwner(authUser.userId);
    sendOk(res, { packages: items });
  };

  create = async (_req: Request, res: Response): Promise<void> => {
    const authUser = getAuthUser(res);
    const body = getValidatedBody<PackageBody>(res);
    const pkg = await this.service.create(authUser.userId, body);
    sendCreated(res, { package: pkg });
  };

  update = async (_req: Request, res: Response): Promise<void> => {
    const authUser = getAuthUser(res);
    const params = getValidatedParams<PackageIdParams>(res);
    const body = getValidatedBody<PackageBody>(res);
    const pkg = await this.service.update(authUser.userId, params.id, body);
    sendOk(res, { package: pkg });
  };

  publish = async (_req: Request, res: Response): Promise<void> => {
    const authUser = getAuthUser(res);
    const params = getValidatedParams<PackageIdParams>(res);
    const pkg = await this.service.publish(authUser.userId, params.id);
    sendOk(res, { package: pkg });
  };

  unpublish = async (_req: Request, res: Response): Promise<void> => {
    const authUser = getAuthUser(res);
    const params = getValidatedParams<PackageIdParams>(res);
    const pkg = await this.service.unpublish(authUser.userId, params.id);
    sendOk(res, { package: pkg });
  };

  deleteDraft = async (_req: Request, res: Response): Promise<void> => {
    const authUser = getAuthUser(res);
    const params = getValidatedParams<PackageIdParams>(res);
    await this.service.deleteDraft(authUser.userId, params.id);
    sendOk(res, { deleted: true });
  };

  hide = async (_req: Request, res: Response): Promise<void> => {
    const authUser = getAuthUser(res);
    const params = getValidatedParams<PackageIdParams>(res);
    const body = getValidatedBody<PackageHideBody>(res);
    const pkg = await this.service.hide(authUser.userId, params.id, body.reason);
    sendOk(res, { package: pkg });
  };

  unhide = async (_req: Request, res: Response): Promise<void> => {
    const authUser = getAuthUser(res);
    const params = getValidatedParams<PackageIdParams>(res);
    const pkg = await this.service.unhide(authUser.userId, params.id);
    sendOk(res, { package: pkg });
  };
}
