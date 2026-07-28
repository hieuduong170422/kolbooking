import type { Express } from 'express';
import { createApp } from '../../src/app.js';
import { InMemorySessionRepository } from '../../src/modules/auth/session.repository.memory.js';
import { InMemoryCreatorRepository } from '../../src/modules/creators/creator.repository.memory.js';
import { CREATOR_SEED } from '../../src/modules/creators/creator.seed.js';
import { InMemoryUserRepository } from '../../src/modules/users/user.repository.memory.js';
import { buildUserSeed } from '../../src/modules/users/user.seed.js';
import type { Creator } from '../../src/modules/creators/creator.types.js';
import type { User } from '../../src/modules/users/user.types.js';

export interface TestAppOptions {
  readonly creators?: readonly Creator[];
  readonly users?: readonly User[];
}

export const buildTestApp = (options: TestAppOptions = {}): Express =>
  createApp({
    creatorRepository: new InMemoryCreatorRepository(options.creators ?? CREATOR_SEED),
    userRepository: new InMemoryUserRepository(options.users ?? []),
    sessionRepository: new InMemorySessionRepository(),
  });

/** App có sẵn tài khoản demo (creator/brand/admin/locked @demo.vn, mật khẩu Demo@1234). */
export const buildTestAppWithUsers = async (): Promise<Express> =>
  buildTestApp({ users: await buildUserSeed() });
