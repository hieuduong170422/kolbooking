import type {
  CreateVerificationTokenInput,
  VerificationPurpose,
  VerificationToken,
} from './verification.types.js';

export interface VerificationTokenRepository {
  create(input: CreateVerificationTokenInput): Promise<VerificationToken>;
  /** Mã mới nhất chưa bị tiêu hủy của user theo purpose — expiry do service kiểm tra. */
  findLatestActive(
    userId: string,
    purpose: VerificationPurpose,
  ): Promise<VerificationToken | null>;
  markConsumed(id: string): Promise<void>;
  /** Tăng số lần nhập sai, trả về bản ghi sau cập nhật. */
  incrementAttempts(id: string): Promise<VerificationToken | null>;
  /** Vô hiệu mọi mã đang chờ của user theo purpose (cấp mã mới thay thế). */
  invalidateAllFor(userId: string, purpose: VerificationPurpose): Promise<void>;
}
