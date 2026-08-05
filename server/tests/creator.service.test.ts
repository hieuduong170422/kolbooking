import { describe, expect, it } from 'vitest';
import { ApiError } from '../src/shared/errors/api-error.js';
import { InMemoryAuditRepository } from '../src/modules/audit/audit.repository.memory.js';
import { InMemoryCreatorRepository } from '../src/modules/creators/creator.repository.memory.js';
import { CREATOR_SEED } from '../src/modules/creators/creator.seed.js';
import { CreatorService } from '../src/modules/creators/creator.service.js';
import type { CreatorListFilter } from '../src/modules/creators/creator.types.js';

const service = new CreatorService(
  new InMemoryCreatorRepository(CREATOR_SEED),
  new InMemoryAuditRepository(),
);

const baseFilter: CreatorListFilter = { sort: 'rating', page: 1, limit: 12 };

describe('CreatorService.listPublicCreators', () => {
  it('map kết quả sang public DTO và giữ nguyên total', async () => {
    const result = await service.listPublicCreators(baseFilter);

    expect(result.total).toBe(4);
    expect(result.items[0]).not.toHaveProperty('status');
    expect(result.items[0]).not.toHaveProperty('createdAt');
  });

  it('sort mặc định theo rating giảm dần', async () => {
    const result = await service.listPublicCreators(baseFilter);
    const ratings = result.items.map((item) => item.rating);

    expect(ratings).toEqual([...ratings].sort((a, b) => b - a));
  });
});

describe('CreatorService.getPublicCreatorById', () => {
  it('trả về DTO cho creator verified', async () => {
    const creator = await service.getPublicCreatorById('crt_0003');
    expect(creator.displayName).toBe('Hoàng Nam Lifestyle');
  });

  it('ném NOT_FOUND cho creator chưa verified', async () => {
    await expect(service.getPublicCreatorById('crt_0005')).rejects.toMatchObject({
      statusCode: 404,
      code: 'NOT_FOUND',
    });
    await expect(service.getPublicCreatorById('crt_0005')).rejects.toBeInstanceOf(ApiError);
  });

  it('ném NOT_FOUND cho id không tồn tại', async () => {
    await expect(service.getPublicCreatorById('crt_xxxx')).rejects.toMatchObject({
      statusCode: 404,
    });
  });
});
