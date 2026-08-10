import type { Request, Response } from 'express';
import { ApiError } from '../../shared/errors/api-error.js';
import { buildPaginationMeta, sendOk } from '../../shared/http/api-response.js';
import {
  getValidatedBody,
  getValidatedParams,
  getValidatedQuery,
} from '../../shared/middlewares/validate.js';
import { getAuthUser } from '../auth/auth.middleware.js';
import type { BrandService } from './brand.service.js';
import type {
  BrandDocParams,
  BrandIdParams,
  BrandProfileBody,
  BrandReviewBody,
  BrandReviewQueueQuery,
} from './brand.validation.js';

export class BrandController {
  private readonly service: BrandService;

  constructor(service: BrandService) {
    this.service = service;
  }

  getMe = async (_req: Request, res: Response): Promise<void> => {
    const authUser = getAuthUser(res);
    const brand = await this.service.getForOwner(authUser.userId);
    sendOk(res, { brand });
  };

  updateMe = async (_req: Request, res: Response): Promise<void> => {
    const authUser = getAuthUser(res);
    const body = getValidatedBody<BrandProfileBody>(res);
    const brand = await this.service.createOrUpdateProfile(authUser.userId, body);
    sendOk(res, { brand });
  };

  uploadDocument = async (req: Request, res: Response): Promise<void> => {
    const authUser = getAuthUser(res);
    // req.file do multer đặt — cast tay vì không dùng @types/multer (mirror creator-portfolio).
    const file = (
      req as Request & {
        file?: { originalname: string; mimetype: string; size: number; buffer: Buffer };
      }
    ).file;
    if (!file) {
      throw ApiError.badRequest('Thiếu file upload (field "file", multipart/form-data).');
    }
    const brand = await this.service.uploadVerificationDoc(authUser.userId, {
      originalName: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
      buffer: file.buffer,
    });
    sendOk(res, { brand });
  };

  submitForReview = async (_req: Request, res: Response): Promise<void> => {
    const authUser = getAuthUser(res);
    const brand = await this.service.submitForReview(authUser.userId);
    sendOk(res, { brand });
  };

  getDocument = async (_req: Request, res: Response): Promise<void> => {
    const authUser = getAuthUser(res);
    const params = getValidatedParams<BrandDocParams>(res);
    const doc = await this.service.getVerificationDoc(
      authUser.userId,
      authUser.role,
      params.id,
      params.docId,
    );
    res
      .status(200)
      .type(doc.mimeType)
      .setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(doc.fileName)}"`)
      .send(doc.buffer);
  };

  listQueue = async (_req: Request, res: Response): Promise<void> => {
    const query = getValidatedQuery<BrandReviewQueueQuery>(res);
    const result = await this.service.listQueue(query.status, query.page, query.limit);
    sendOk(res, result.items, buildPaginationMeta(result.page, result.limit, result.total));
  };

  review = async (_req: Request, res: Response): Promise<void> => {
    const authUser = getAuthUser(res);
    const params = getValidatedParams<BrandIdParams>(res);
    const body = getValidatedBody<BrandReviewBody>(res);
    const brand = await this.service.review(authUser.userId, params.id, body.action, body.reason);
    sendOk(res, { brand });
  };
}
