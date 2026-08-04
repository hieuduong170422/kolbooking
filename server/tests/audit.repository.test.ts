import { describe, expect, it } from 'vitest';
import { InMemoryAuditRepository } from '../src/modules/audit/audit.repository.memory.js';
import type { CreateAuditEntryInput } from '../src/modules/audit/audit.types.js';

const baseInput = (overrides: Partial<CreateAuditEntryInput> = {}): CreateAuditEntryInput => ({
  actorId: 'usr_creator1',
  action: 'creator.update_profile',
  targetType: 'creator',
  targetId: 'crt_0005',
  before: { displayName: 'Cũ' },
  after: { displayName: 'Mới' },
  reason: null,
  ...overrides,
});

describe('InMemoryAuditRepository.create', () => {
  it('tạo entry gán id dạng aud_ + uuid và createdAt ISO (BR-015)', async () => {
    const repo = new InMemoryAuditRepository();
    const entry = await repo.create(baseInput());

    expect(entry.id).toMatch(/^aud_[0-9a-f-]{36}$/);
    expect(Number.isNaN(Date.parse(entry.createdAt))).toBe(false);
    expect(entry.actorId).toBe('usr_creator1');
    expect(entry.action).toBe('creator.update_profile');
    expect(entry.targetType).toBe('creator');
    expect(entry.targetId).toBe('crt_0005');
    expect(entry.before).toEqual({ displayName: 'Cũ' });
    expect(entry.after).toEqual({ displayName: 'Mới' });
    expect(entry.reason).toBeNull();
  });

  it('không đổi dữ liệu nguồn — không mutate input hoặc entry đã lưu (BR-015)', async () => {
    const repo = new InMemoryAuditRepository();
    const input = baseInput();
    await repo.create(input);

    (input.after as { displayName: string }).displayName = 'Bị sửa';

    const [saved] = await repo.listAll();
    expect(saved.after).toEqual({ displayName: 'Mới' });
  });
});

describe('InMemoryAuditRepository.listByTarget', () => {
  it('trả về danh sách theo đúng thứ tự append và đúng target (BR-015)', async () => {
    const repo = new InMemoryAuditRepository();
    await repo.create(baseInput({ targetId: 'crt_0005', action: 'creator.submit_review' }));
    await repo.create(baseInput({ targetId: 'crt_0005', action: 'creator.approve' }));
    await repo.create(baseInput({ targetId: 'crt_0006', action: 'creator.submit_review' }));

    const entries = await repo.listByTarget('creator', 'crt_0005');
    expect(entries).toHaveLength(2);
    expect(entries.map((entry) => entry.action)).toEqual([
      'creator.submit_review',
      'creator.approve',
    ]);
  });
});

describe('InMemoryAuditRepository.listAll', () => {
  it('trả về mọi entry theo thứ tự append (BR-015)', async () => {
    const repo = new InMemoryAuditRepository();
    await repo.create(baseInput({ action: 'creator.submit_review' }));
    await repo.create(baseInput({ action: 'admin.verify' }));

    const all = await repo.listAll();
    expect(all).toHaveLength(2);
    expect(all.map((entry) => entry.action)).toEqual(['creator.submit_review', 'admin.verify']);
  });

  it('trả về bản sao bất biến — mutate kết quả không ảnh hưởng store (BR-015)', async () => {
    const repo = new InMemoryAuditRepository();
    await repo.create(baseInput());

    const firstRead = await repo.listAll();
    (firstRead[0] as { action: string }).action = 'HACKED';
    const all = (await repo.listAll()) as Array<{ action: string }>;
    expect(all[0].action).toBe('creator.update_profile');
  });
});
