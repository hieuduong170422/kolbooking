/**
 * AuditLog (SRS §10.1) — lịch sử bất biến của mọi thao tác quan trọng.
 * Chỉ ghi actor/action/target/reason — KHÔNG bao giờ chứa password, token hay OTP.
 */
export interface AuditEntry {
  id: string;
  actorId: string;
  action: string;
  targetType: string;
  targetId: string;
  before: unknown | null;
  after: unknown | null;
  reason: string | null;
  createdAt: string;
}

export type CreateAuditEntryInput = Omit<AuditEntry, 'id' | 'createdAt'>;
