import type { NextFunction, Request, Response } from 'express';
import type { ZodType } from 'zod';

export interface ValidationSchemas {
  readonly body?: ZodType;
  readonly query?: ZodType;
  readonly params?: ZodType;
}

/**
 * Parses request parts with Zod and stores the TYPED result in res.locals.
 * Express 5 makes req.query read-only, so parsed values live in res.locals
 * and are read back via the getValidated* helpers below.
 * ZodError thrown here is converted by the global error handler.
 */
export const validate =
  (schemas: ValidationSchemas) =>
  (req: Request, res: Response, next: NextFunction): void => {
    if (schemas.params) {
      res.locals['validatedParams'] = schemas.params.parse(req.params);
    }
    if (schemas.query) {
      res.locals['validatedQuery'] = schemas.query.parse(req.query);
    }
    if (schemas.body) {
      res.locals['validatedBody'] = schemas.body.parse(req.body);
    }
    next();
  };

export const getValidatedParams = <T>(res: Response): T => res.locals['validatedParams'] as T;
export const getValidatedQuery = <T>(res: Response): T => res.locals['validatedQuery'] as T;
export const getValidatedBody = <T>(res: Response): T => res.locals['validatedBody'] as T;
