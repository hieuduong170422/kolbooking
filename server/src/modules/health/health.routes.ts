import { Router, type Request, type Response } from 'express';
import { sendOk } from '../../shared/http/api-response.js';

export const createHealthRouter = (): Router => {
  const router = Router();

  router.get('/', (_req: Request, res: Response) => {
    sendOk(res, {
      status: 'ok',
      uptimeSeconds: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
    });
  });

  return router;
};
