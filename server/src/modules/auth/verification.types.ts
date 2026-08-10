export const VERIFICATION_PURPOSES = ['email_verify', 'password_reset'] as const;
export type VerificationPurpose = (typeof VERIFICATION_PURPOSES)[number];

/**
 * Mã xác minh một lần (OTP) — dùng chung cho xác minh email (AUTH-002)
 * và đặt lại mật khẩu (AUTH-004). Chỉ lưu hash, không lưu mã gốc (SEC-009).
 */
export interface VerificationToken {
  readonly id: string;
  readonly userId: string;
  readonly purpose: VerificationPurpose;
  readonly codeHash: string;
  readonly expiresAt: string;
  readonly consumedAt: string | null;
  readonly attemptCount: number;
  readonly createdAt: string;
}

export interface CreateVerificationTokenInput {
  readonly userId: string;
  readonly purpose: VerificationPurpose;
  readonly codeHash: string;
  readonly expiresAt: string;
}
