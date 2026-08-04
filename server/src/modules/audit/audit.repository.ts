import type { AuditEntry, CreateAuditEntryInput } from './audit.types.js';

/**
 * Repository Pattern: business logic chỉ phụ thuộc interface này.
 * Audit là append-only (BR-015 — không xóa cứng audit log) nên interface
 * chỉ expose create/list — tuyệt đối không có update/delete.
 * MVP dùng InMemoryAuditRepository; khi có PostgreSQL chỉ cần thêm
 * implementation mới mà không đổi service/controller.
 */
export interface AuditRepository {
  create(input: CreateAuditEntryInput): Promise<AuditEntry>;
  listByTarget(targetType: string, targetId: string): Promise<readonly AuditEntry[]>;
  listAll(): Promise<readonly AuditEntry[]>;
}
