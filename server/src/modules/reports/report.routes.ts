import { Router } from 'express';
import type { Request, Response } from 'express';
import { z } from 'zod';
import { ApiError } from '../../shared/errors/api-error.js';
import {
  buildPaginationMeta,
  sendCreated,
  sendOk,
} from '../../shared/http/api-response.js';
import {
  getValidatedBody,
  getValidatedParams,
  getValidatedQuery,
  validate,
} from '../../shared/middlewares/validate.js';
import type { AuditRepository } from '../audit/audit.repository.js';
import { getAuthUser, requireAuth, requireRole } from '../auth/auth.middleware.js';
import type { CreatorRepository } from '../creators/creator.repository.js';
import type { PackageRepository } from '../packages/package.repository.js';
import type { ReportRepository } from './report.repository.js';
import { REPORT_REASONS, REPORT_STATUSES, REPORT_TARGET_TYPES } from './report.types.js';
import type { ReportTargetType } from './report.types.js';

const MAX_PAGE_LIMIT = 50;
const DEFAULT_PAGE_LIMIT = 20;

const createReportBodySchema = z.object({
  targetType: z.enum(REPORT_TARGET_TYPES),
  targetId: z.string().regex(/^(crt|pkg)_[a-zA-Z0-9]+$/, 'ID đối tượng không hợp lệ.'),
  reason: z.enum(REPORT_REASONS),
  description: z.string().trim().min(10, 'Mô tả tối thiểu 10 ký tự.').max(1000),
});

type CreateReportBody = z.infer<typeof createReportBodySchema>;

const reportListQuerySchema = z.object({
  status: z.enum(REPORT_STATUSES).default('open'),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(MAX_PAGE_LIMIT).default(DEFAULT_PAGE_LIMIT),
});

type ReportListQuery = z.infer<typeof reportListQuerySchema>;

const reportIdParamsSchema = z.object({
  id: z.string().regex(/^rpt_[a-zA-Z0-9]+$/, 'ID báo cáo không hợp lệ.'),
});

type ReportIdParams = z.infer<typeof reportIdParamsSchema>;

const resolveReportBodySchema = z.object({
  status: z.enum(['resolved', 'dismissed']),
  note: z.string().trim().min(5, 'Ghi chú xử lý tối thiểu 5 ký tự.').max(500),
});

type ResolveReportBody = z.infer<typeof resolveReportBodySchema>;

export interface ReportRouterDeps {
  readonly reportRepository: ReportRepository;
  readonly creatorRepository: CreatorRepository;
  readonly packageRepository: PackageRepository;
  readonly auditRepository: AuditRepository;
}

/**
 * Báo cáo vi phạm từ trang công khai → moderation ticket (SRCH-007, ADM-010).
 * Người báo cáo phải đăng nhập để chống spam; admin xem queue và đóng ticket.
 */
export const createReportRouter = (deps: ReportRouterDeps): Router => {
  const router = Router();

  /** Đối tượng bị báo cáo phải tồn tại — tránh ticket rác trỏ vào ID bịa. */
  const assertTargetExists = async (
    targetType: ReportTargetType,
    targetId: string,
  ): Promise<void> => {
    const found =
      targetType === 'creator'
        ? await deps.creatorRepository.findById(targetId)
        : await deps.packageRepository.findById(targetId);
    if (!found) {
      throw ApiError.notFound('Không tìm thấy đối tượng cần báo cáo.');
    }
  };

  router.post(
    '/',
    requireAuth,
    validate({ body: createReportBodySchema }),
    async (_req: Request, res: Response): Promise<void> => {
      const authUser = getAuthUser(res);
      const body = getValidatedBody<CreateReportBody>(res);
      await assertTargetExists(body.targetType, body.targetId);

      const report = await deps.reportRepository.create({
        targetType: body.targetType,
        targetId: body.targetId,
        reason: body.reason,
        description: body.description,
        reporterUserId: authUser.userId,
      });
      sendCreated(res, { report });
    },
  );

  router.get(
    '/',
    requireAuth,
    requireRole('admin'),
    validate({ query: reportListQuerySchema }),
    async (_req: Request, res: Response): Promise<void> => {
      const query = getValidatedQuery<ReportListQuery>(res);
      const result = await deps.reportRepository.list(query);
      sendOk(res, result.items, buildPaginationMeta(query.page, query.limit, result.total));
    },
  );

  router.post(
    '/:id/resolve',
    requireAuth,
    requireRole('admin'),
    validate({ params: reportIdParamsSchema, body: resolveReportBodySchema }),
    async (_req: Request, res: Response): Promise<void> => {
      const admin = getAuthUser(res);
      const params = getValidatedParams<ReportIdParams>(res);
      const body = getValidatedBody<ResolveReportBody>(res);

      const existing = await deps.reportRepository.findById(params.id);
      if (!existing) {
        throw ApiError.notFound('Không tìm thấy báo cáo này.');
      }
      if (existing.status !== 'open') {
        throw ApiError.conflict('Báo cáo này đã được xử lý.');
      }

      const updated = await deps.reportRepository.resolve(params.id, body.status, body.note);
      if (!updated) {
        throw ApiError.internal('Không tìm thấy báo cáo để cập nhật.');
      }
      await deps.auditRepository.create({
        actorId: admin.userId,
        action: `report.${body.status}`,
        targetType: 'report',
        targetId: params.id,
        before: existing.status,
        after: updated.status,
        reason: body.note,
      });
      sendOk(res, { report: updated });
    },
  );

  return router;
};
