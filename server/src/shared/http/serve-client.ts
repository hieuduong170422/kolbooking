import path from 'node:path';
import express, { type Express, type NextFunction, type Request, type Response } from 'express';

/** Đường dẫn do API sở hữu — không bao giờ được trả về index.html của client. */
const isApiPath = (urlPath: string): boolean =>
  urlPath.startsWith('/api/') || urlPath.startsWith('/uploads/');

/** Một tháng, tính bằng giây — tài sản có hash trong tên nên cache được lâu. */
const ASSET_MAX_AGE_SECONDS = 30 * 24 * 60 * 60;

/**
 * Phục vụ bản build của client ngay trong API: một tiến trình chạy được cả
 * giao diện lẫn API, không cần reverse proxy đứng trước.
 *
 * Mọi đường dẫn không trỏ tới file có thật đều trả index.html để React Router
 * tự định tuyến — TRỪ /api và /uploads: hai nhánh đó phải giữ nguyên lỗi 404
 * dạng JSON, nếu không client sẽ nhận về một trang HTML thay cho lỗi API và
 * báo "unexpected token <" thay vì thông báo thật.
 */
export const mountClient = (app: Express, clientDir: string): void => {
  app.use(
    express.static(clientDir, {
      // index.html do handler bên dưới trả, để đi chung một đường với route SPA.
      index: false,
      setHeaders: (res, filePath) => {
        if (filePath.includes(`${path.sep}assets${path.sep}`)) {
          res.setHeader('Cache-Control', `public, max-age=${ASSET_MAX_AGE_SECONDS}, immutable`);
        }
      },
    }),
  );

  app.use((req: Request, res: Response, next: NextFunction): void => {
    if ((req.method !== 'GET' && req.method !== 'HEAD') || isApiPath(req.path)) {
      next();
      return;
    }
    // index.html KHÔNG được cache: nó tham chiếu tới tên file tài sản có hash,
    // cache lại thì sau khi deploy người dùng vẫn nạp bản cũ.
    res.setHeader('Cache-Control', 'no-cache');
    res.sendFile(path.join(clientDir, 'index.html'), (err: unknown) => {
      if (err) {
        next(err);
      }
    });
  });
};
