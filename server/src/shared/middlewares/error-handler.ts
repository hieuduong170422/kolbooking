import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import { ApiError } from '../errors/api-error.js';
import { buildErrorBody } from '../http/api-response.js';
import { logger } from '../logger/logger.js';

const zodErrorToDetails = (error: ZodError) =>
  error.issues.map((issue) => ({
    field: issue.path.join('.'),
    message: issue.message,
  }));

/**
 * Global error handler: maps known error types to the API envelope.
 * Unexpected errors are logged with full context but never leak internals.
 */
export const errorHandler = (
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction,
): void => {
  if (err instanceof ApiError) {
    logger.warn({ code: err.code, path: req.path, method: req.method }, err.message);
    res.status(err.statusCode).json(buildErrorBody(err.code, err.message, err.details));
    return;
  }

  if (err instanceof ZodError) {
    const details = zodErrorToDetails(err);
    logger.warn({ path: req.path, method: req.method, details }, 'Validation failed');
    res.status(400).json(buildErrorBody('VALIDATION_ERROR', 'Dữ liệu gửi lên không hợp lệ.', details));
    return;
  }

  logger.error({ err, path: req.path, method: req.method }, 'Unhandled error');
  res
    .status(500)
    .json(buildErrorBody('INTERNAL_ERROR', 'Đã xảy ra lỗi hệ thống. Vui lòng thử lại sau.'));
};
