import { Router } from 'express';
import type { Request, Response } from 'express';
import { z } from 'zod';
import { buildPaginationMeta, sendOk } from '../../shared/http/api-response.js';
import { getValidatedQuery, validate } from '../../shared/middlewares/validate.js';
import { requireAuth, requireRole } from '../auth/auth.middleware.js';
import type { UserRepository } from '../users/user.repository.js';
import type { AuditRepository } from './audit.repository.js';
import { AUDIT_TARGET_TYPES } from './audit.types.js';
import { AuditService } from './audit.service.js';

const MAX_PAGE_LIMIT = 100;
const DEFAULT_PAGE_LIMIT = 25;

export const auditListQuerySchema = z.object({
  targetType: z.enum(AUDIT_TARGET_TYPES).optional(),
  action: z.string().trim().min(1).max(60).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(MAX_PAGE_LIMIT).default(DEFAULT_PAGE_LIMIT),
});

export type AuditListQuery = z.infer<typeof auditListQuerySchema>;

export interface AuditRouterDeps {
  readonly auditRepository: AuditRepository;
  readonly userRepository: UserRepository;
}

/** Audit log chỉ đọc, chỉ admin (ADM-009) — không có endpoint sửa/xóa. */
export const createAuditRouter = (deps: AuditRouterDeps): Router => {
  const service = new AuditService(deps.auditRepository, deps.userRepository);
  const router = Router();

  router.get(
    '/',
    requireAuth,
    requireRole('admin'),
    validate({ query: auditListQuerySchema }),
    async (_req: Request, res: Response): Promise<void> => {
      const query = getValidatedQuery<AuditListQuery>(res);
      const result = await service.list(query);
      sendOk(res, result.items, buildPaginationMeta(result.page, result.limit, result.total));
    },
  );

  return router;
};
