import type { Request, Response } from 'express';
import { ApiError } from '../../shared/errors/api-error.js';
import { sendCreated, sendOk } from '../../shared/http/api-response.js';
import { getValidatedBody, getValidatedParams } from '../../shared/middlewares/validate.js';
import { getAuthUser } from '../auth/auth.middleware.js';
import type { CreatorPortfolioService, UploadedFile } from './creator-portfolio.service.js';
import {
  multipartPortfolioBodySchema,
  type LinkPortfolioItemBody,
  type PortfolioItemParams,
} from './creator-portfolio.validation.js';

/** req.file do multer đặt — khai báo tay vì không dùng @types/multer. */
const getUploadedFile = (req: Request): UploadedFile => {
  const file = (req as Request & { file?: UploadedFile }).file;
  if (!file) throw ApiError.badRequest('Thiếu file upload.');
  return file;
};

/** Controller layer: đọc input đã validate, gọi service và trả envelope. */
export class CreatorPortfolioController {
  private readonly service: CreatorPortfolioService;

  constructor(service: CreatorPortfolioService) {
    this.service = service;
  }

  /** POST /me/portfolio — nhánh JSON (link) hoặc multipart (file image/video). */
  addPortfolioItem = async (req: Request, res: Response): Promise<void> => {
    const authUser = getAuthUser(res);
    if (req.is('application/json')) {
      const body = getValidatedBody<LinkPortfolioItemBody>(res);
      const item = await this.service.addLinkItem(
        authUser.userId,
        body.url,
        body.caption ?? null,
        body.category ?? null,
      );
      sendCreated(res, item);
      return;
    }

    const file = getUploadedFile(req);
    const body = multipartPortfolioBodySchema.parse(req.body ?? {});
    const item = await this.service.uploadImageOrVideo(
      authUser.userId,
      file,
      body.caption ?? null,
      body.category ?? null,
    );
    sendCreated(res, item);
  };

  /** DELETE /me/portfolio/:itemId — xóa mục + file nếu là upload nội bộ. */
  removePortfolioItem = async (_req: Request, res: Response): Promise<void> => {
    const authUser = getAuthUser(res);
    const params = getValidatedParams<PortfolioItemParams>(res);
    await this.service.removeItem(authUser.userId, params.itemId);
    sendOk(res, { deleted: true });
  };

  /** POST /me/avatar — upload ảnh đại diện, cập nhật avatarUrl của profile. */
  updateAvatar = async (req: Request, res: Response): Promise<void> => {
    const authUser = getAuthUser(res);
    const file = getUploadedFile(req);
    const profile = await this.service.updateAvatar(authUser.userId, file);
    sendOk(res, profile);
  };
}
