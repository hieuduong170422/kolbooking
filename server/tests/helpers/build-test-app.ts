import type { Express } from 'express';
import { createApp } from '../../src/app.js';
import { InMemoryCreatorRepository } from '../../src/modules/creators/creator.repository.memory.js';
import { CREATOR_SEED } from '../../src/modules/creators/creator.seed.js';
import type { Creator } from '../../src/modules/creators/creator.types.js';

export const buildTestApp = (creators: readonly Creator[] = CREATOR_SEED): Express =>
  createApp({ creatorRepository: new InMemoryCreatorRepository(creators) });
