import { randomUUID } from 'node:crypto';
import type {
  AuditListFilter,
  AuditListResult,
  AuditRepository,
} from './audit.repository.js';
import type { AuditEntry, CreateAuditEntryInput } from './audit.types.js';

/**
 * In-memory implementation — append-only (BR-015: audit log không xóa cứng).
 * Mọi thao tác trả về bản sao mới (structuredClone) — không bao giờ
 * expose tham chiếu tới dữ liệu nguồn để tránh mutate store.
 */
export class InMemoryAuditRepository implements AuditRepository {
  private readonly entries: AuditEntry[] = [];

  create(input: CreateAuditEntryInput): Promise<AuditEntry> {
    const entry: AuditEntry = {
      id: `aud_${randomUUID()}`,
      actorId: input.actorId,
      action: input.action,
      targetType: input.targetType,
      targetId: input.targetId,
      before: input.before === null ? null : structuredClone(input.before),
      after: input.after === null ? null : structuredClone(input.after),
      reason: input.reason,
      createdAt: new Date().toISOString(),
    };
    this.entries.push(entry);
    return Promise.resolve(entry);
  }

  listByTarget(targetType: string, targetId: string): Promise<readonly AuditEntry[]> {
    const matches = this.entries
      .filter((entry) => entry.targetType === targetType && entry.targetId === targetId)
      .map((entry) => this.clone(entry));
    return Promise.resolve(matches);
  }

  listAll(): Promise<readonly AuditEntry[]> {
    return Promise.resolve(this.entries.map((entry) => this.clone(entry)));
  }

  list(filter: AuditListFilter): Promise<AuditListResult> {
    const action = filter.action?.trim().toLowerCase();
    const matched = this.entries
      .filter((entry) => {
        if (filter.targetType && entry.targetType !== filter.targetType) return false;
        if (action && !entry.action.toLowerCase().includes(action)) return false;
        return true;
      })
      // Mới nhất lên đầu — audit đọc theo dòng thời gian ngược.
      .slice()
      .reverse();

    const start = (filter.page - 1) * filter.limit;
    return Promise.resolve({
      items: matched.slice(start, start + filter.limit).map((entry) => this.clone(entry)),
      total: matched.length,
    });
  }

  private clone(entry: AuditEntry): AuditEntry {
    return {
      ...entry,
      before: entry.before === null ? null : structuredClone(entry.before),
      after: entry.after === null ? null : structuredClone(entry.after),
    };
  }
}
