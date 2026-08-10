import { createHmac, randomInt } from 'node:crypto';
import { env } from '../../config/env.js';
import { ApiError } from '../../shared/errors/api-error.js';
import type { Mailer } from '../../shared/email/mailer.js';
import { toUserDto } from '../users/user.mapper.js';
import type { UserRepository } from '../users/user.repository.js';
import type { User, UserDto } from '../users/user.types.js';
import { hashPassword } from './password.service.js';
import type { SessionRepository } from './session.repository.js';
import type { VerificationTokenRepository } from './verification.repository.js';
import type { VerificationPurpose } from './verification.types.js';

const MINUTE_MS = 60 * 1000;

/** HMAC với JWT_SECRET thay vì hash trần — OTP 6 số quá ít entropy để chống brute-force offline. */
export const hashOtp = (code: string): string =>
  createHmac('sha256', env.JWT_SECRET).update(code).digest('hex');

const generateOtp = (): string => randomInt(0, 1_000_000).toString().padStart(6, '0');

// Message chung cho mọi trường hợp mã sai/hết hạn — không tiết lộ trạng thái nội bộ.
const INVALID_CODE_MESSAGE = 'Mã xác minh không đúng hoặc đã hết hạn. Vui lòng thử lại hoặc yêu cầu mã mới.';

/**
 * Cấp và tiêu thụ mã OTP một lần: xác minh email (AUTH-002) và
 * đặt lại mật khẩu (AUTH-004). Mã có TTL, giới hạn số lần nhập sai,
 * cấp mã mới làm mã cũ mất hiệu lực.
 */
export class VerificationService {
  private readonly users: UserRepository;
  private readonly sessions: SessionRepository;
  private readonly tokens: VerificationTokenRepository;
  private readonly mailer: Mailer;

  constructor(
    users: UserRepository,
    sessions: SessionRepository,
    tokens: VerificationTokenRepository,
    mailer: Mailer,
  ) {
    this.users = users;
    this.sessions = sessions;
    this.tokens = tokens;
    this.mailer = mailer;
  }

  async requestEmailVerification(userId: string): Promise<void> {
    const user = await this.users.findById(userId);
    if (!user) {
      throw ApiError.unauthorized();
    }
    if (user.emailVerifiedAt) {
      throw ApiError.badRequest('Email đã được xác minh trước đó.');
    }
    await this.issueCode(user, 'email_verify', {
      subject: 'Mã xác minh email — KOL Booking',
      text: (code) =>
        `Mã xác minh email của bạn là ${code}. Mã có hiệu lực trong ${env.OTP_TTL_MINUTES} phút.`,
    });
  }

  async confirmEmailVerification(userId: string, code: string): Promise<UserDto> {
    const user = await this.users.findById(userId);
    if (!user) {
      throw ApiError.unauthorized();
    }
    if (user.emailVerifiedAt) {
      throw ApiError.badRequest('Email đã được xác minh trước đó.');
    }
    await this.consumeCode(user.id, 'email_verify', code);
    const updated = await this.users.update(user.id, {
      emailVerifiedAt: new Date().toISOString(),
    });
    if (!updated) {
      throw ApiError.unauthorized();
    }
    return toUserDto(updated);
  }

  /** Luôn thành công về mặt API — không tiết lộ email có tài khoản hay không (SEC). */
  async requestPasswordReset(email: string): Promise<void> {
    const user = await this.users.findByEmail(email);
    if (!user || user.status !== 'active') {
      return;
    }
    await this.issueCode(user, 'password_reset', {
      subject: 'Mã đặt lại mật khẩu — KOL Booking',
      text: (code) =>
        `Mã đặt lại mật khẩu của bạn là ${code}. Mã có hiệu lực trong ${env.OTP_TTL_MINUTES} phút. Nếu bạn không yêu cầu, hãy bỏ qua email này.`,
    });
  }

  async resetPassword(email: string, code: string, newPassword: string): Promise<void> {
    const user = await this.users.findByEmail(email);
    if (!user) {
      // Message giống hệt trường hợp mã sai — không lộ tài khoản tồn tại.
      throw ApiError.badRequest(INVALID_CODE_MESSAGE);
    }
    await this.consumeCode(user.id, 'password_reset', code);

    const passwordHash = await hashPassword(newPassword);
    await this.users.update(user.id, { passwordHash });
    // Đổi mật khẩu = thu hồi toàn bộ phiên cũ (AUTH-004, chống chiếm phiên).
    await this.sessions.revokeAllForUser(user.id);
  }

  private async issueCode(
    user: User,
    purpose: VerificationPurpose,
    template: { subject: string; text: (code: string) => string },
  ): Promise<void> {
    // Mã mới thay thế mọi mã đang chờ — chỉ một mã hiệu lực tại một thời điểm.
    await this.tokens.invalidateAllFor(user.id, purpose);

    const code = generateOtp();
    const expiresAt = new Date(Date.now() + env.OTP_TTL_MINUTES * MINUTE_MS).toISOString();
    await this.tokens.create({
      userId: user.id,
      purpose,
      codeHash: hashOtp(code),
      expiresAt,
    });

    await this.mailer.send({
      to: user.email,
      subject: template.subject,
      text: template.text(code),
    });
  }

  private async consumeCode(
    userId: string,
    purpose: VerificationPurpose,
    code: string,
  ): Promise<void> {
    const token = await this.tokens.findLatestActive(userId, purpose);
    if (!token || Date.parse(token.expiresAt) <= Date.now()) {
      throw ApiError.badRequest(INVALID_CODE_MESSAGE);
    }
    if (token.attemptCount >= env.OTP_MAX_ATTEMPTS) {
      throw ApiError.badRequest(
        'Mã đã bị khóa do nhập sai quá nhiều lần. Vui lòng yêu cầu mã mới.',
      );
    }
    if (hashOtp(code) !== token.codeHash) {
      await this.tokens.incrementAttempts(token.id);
      throw ApiError.badRequest(INVALID_CODE_MESSAGE);
    }
    await this.tokens.markConsumed(token.id);
  }
}
