import type { Request, Response } from 'express';
import { buildErrorBody } from '../http/api-response.js';

export const notFoundHandler = (req: Request, res: Response): void => {
  res
    .status(404)
    .json(buildErrorBody('NOT_FOUND', `Không tìm thấy đường dẫn ${req.method} ${req.path}.`));
};
