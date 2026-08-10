import type { UserRepository } from '../users/user.repository.js';
import type { AuditListFilter, AuditRepository } from './audit.repository.js';
import type { AuditEntry } from './audit.types.js';

/** Entry kèm email người thực hiện — actorId thuần không đọc được (ADM-009). */
export interface AuditEntryDto extends AuditEntry {
  readonly actorEmail: string;
}

export interface AuditListPage {
  readonly items: readonly AuditEntryDto[];
  readonly total: number;
  readonly page: number;
  readonly limit: number;
}

/**
 * Đọc audit log cho admin (ADM-009). Chỉ đọc — không có API sửa/xóa,
 * đúng nguyên tắc append-only (BR-015).
 */
export class AuditService {
  private readonly audit: AuditRepository;
  private readonly users: UserRepository;

  constructor(audit: AuditRepository, users: UserRepository) {
    this.audit = audit;
    this.users = users;
  }

  async list(filter: AuditListFilter): Promise<AuditListPage> {
    const { items, total } = await this.audit.list(filter);

    // Gom actorId trùng để không truy vấn lặp cho cùng một người.
    const emailByActorId = new Map<string, string>();
    for (const entry of items) {
      if (!emailByActorId.has(entry.actorId)) {
        const actor = await this.users.findById(entry.actorId);
        emailByActorId.set(entry.actorId, actor?.email ?? 'hệ thống');
      }
    }

    return {
      items: items.map((entry) => ({
        ...entry,
        actorEmail: emailByActorId.get(entry.actorId) ?? 'hệ thống',
      })),
      total,
      page: filter.page,
      limit: filter.limit,
    };
  }
}
