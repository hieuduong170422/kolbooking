import type { Server } from 'node:http';
import { buildUserSeed } from '../../src/modules/users/user.seed.js';
import { buildTestApp, type TestAppOptions } from './build-test-app.js';
import { listenTestApp } from './server-registry.js';

export { listenTestApp } from './server-registry.js';

/**
 * Server test dùng chung một listener thay vì mở cổng mới cho từng request.
 *
 * Vì sao cần: `request(app)` của supertest nhận một Express app thì mỗi
 * REQUEST nó tự `app.listen(0)` rồi đóng lại. Cả suite là hàng nghìn vòng
 * listen/close, và thỉnh thoảng đỏ ở tầng vận chuyển — `read ECONNRESET`,
 * hoặc endpoint public trả 401 vì nhận response của socket khác. Đưa cho
 * supertest một Server ĐANG listen thì nó dùng lại.
 */
export const buildTestServer = (options: TestAppOptions = {}): Server =>
  listenTestApp(buildTestApp(options));

/** Server có sẵn tài khoản demo (creator/brand/admin/locked @demo.vn). */
export const buildTestServerWithUsers = async (): Promise<Server> =>
  buildTestServer({ users: await buildUserSeed() });
