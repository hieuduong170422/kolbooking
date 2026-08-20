import { env } from '../../config/env.js';
import { ApiError } from '../../shared/errors/api-error.js';
import { logger } from '../../shared/logger/logger.js';
import type { AuditRepository } from '../audit/audit.repository.js';
import { toUserDto } from '../users/user.mapper.js';
import type { UserRepository } from '../users/user.repository.js';
import type { User, UserDto } from '../users/user.types.js';
import { hashPassword, verifyPassword } from './password.service.js';
import type { SessionRepository } from './session.repository.js';
import {
  generateRefreshToken,
  hashRefreshToken,
  signAccessToken,
} from './token.service.js';
import type { VerificationService } from './verification.service.js';
import type { LoginBody, RegisterBody } from './auth.validation.js';

export interface AuthResult {
  readonly user: UserDto;
  readonly accessToken: string;
  readonly refreshToken: string;
}

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Business rules xác thực: đăng ký, đăng nhập, refresh xoay vòng, đăng xuất.
 * Refresh token là opaque string, chỉ lưu hash; mỗi lần refresh cấp token mới
 * và thu hồi token cũ (chống replay).
 */
export class AuthService {
  private readonly users: UserRepository;
  private readonly sessions: SessionRepository;
  private readonly verification: VerificationService;
  private readonly audit: AuditRepository;

  constructor(
    users: UserRepository,
    sessions: SessionRepository,
    verification: VerificationService,
    audit: AuditRepository,
  ) {
    this.users = users;
    this.sessions = sessions;
    this.verification = verification;
    this.audit = audit;
  }

  async register(input: RegisterBody): Promise<AuthResult> {
    const existing = await this.users.findByEmail(input.email);
    if (existing) {
      throw ApiError.conflict('Email này đã được đăng ký.');
    }

    const passwordHash = await hashPassword(input.password);
    const consent = {
      // AUTH-007: ghi version + timestamp + nguồn consent tại thời điểm chấp nhận.
      version: env.TERMS_VERSION,
      acceptedAt: new Date().toISOString(),
      source: 'web_register',
    };
    const user = await this.users.create({
      email: input.email,
      passwordHash,
      displayName: input.displayName,
      role: input.role,
      consent,
    });

    // Đồng ý điều khoản là sự kiện pháp lý — phải có dấu vết độc lập với bản
    // ghi user (user có thể đổi, audit thì append-only). KHÔNG ghi mật khẩu.
    await this.audit.create({
      actorId: user.id,
      action: 'user.register',
      targetType: 'user',
      targetId: user.id,
      before: null,
      after: { role: user.role, termsVersion: consent.version },
      reason: null,
    });

    // AUTH-002: gửi OTP xác minh ngay khi đăng ký. Lỗi gửi mail không làm hỏng
    // đăng ký — user vẫn có thể bấm "gửi lại mã" sau.
    try {
      await this.verification.requestEmailVerification(user.id);
    } catch (error) {
      logger.warn({ err: error, userId: user.id }, 'Gửi OTP xác minh sau đăng ký thất bại');
    }

    return this.issueTokens(user);
  }

  async login(input: LoginBody): Promise<AuthResult> {
    const user = await this.users.findByEmail(input.email);
    const passwordOk = user ? await verifyPassword(input.password, user.passwordHash) : false;
    if (!user || !passwordOk) {
      // Message chung cho cả hai trường hợp — không tiết lộ email có tồn tại hay không.
      throw ApiError.unauthorized('Email hoặc mật khẩu không đúng.');
    }
    this.assertActive(user);

    return this.issueTokens(user);
  }

  async refresh(refreshToken: string): Promise<AuthResult> {
    const tokenHash = hashRefreshToken(refreshToken);
    const session = await this.sessions.findByTokenHash(tokenHash);
    const now = Date.now();

    if (!session || session.revokedAt !== null || Date.parse(session.expiresAt) <= now) {
      throw ApiError.unauthorized('Phiên đăng nhập không còn hiệu lực. Vui lòng đăng nhập lại.');
    }

    const user = await this.users.findById(session.userId);
    if (!user) {
      throw ApiError.unauthorized('Phiên đăng nhập không còn hiệu lực. Vui lòng đăng nhập lại.');
    }
    this.assertActive(user);

    // Xoay vòng: thu hồi token cũ trước khi cấp token mới.
    await this.sessions.revoke(tokenHash);
    return this.issueTokens(user);
  }

  async logout(refreshToken: string): Promise<void> {
    await this.sessions.revoke(hashRefreshToken(refreshToken));
  }

  async getCurrentUser(userId: string): Promise<UserDto> {
    const user = await this.users.findById(userId);
    if (!user) {
      throw ApiError.unauthorized();
    }
    this.assertActive(user);
    return toUserDto(user);
  }

  private assertActive(user: User): void {
    if (user.status !== 'active') {
      throw ApiError.forbidden('Tài khoản đã bị khóa. Liên hệ hỗ trợ để biết thêm chi tiết.');
    }
  }

  private async issueTokens(user: User): Promise<AuthResult> {
    const accessToken = await signAccessToken({ userId: user.id, role: user.role });
    const refreshToken = generateRefreshToken();
    const expiresAt = new Date(Date.now() + env.REFRESH_TOKEN_TTL_DAYS * DAY_MS).toISOString();

    await this.sessions.create({
      tokenHash: hashRefreshToken(refreshToken),
      userId: user.id,
      expiresAt,
      revokedAt: null,
    });

    return { user: toUserDto(user), accessToken, refreshToken };
  }
}
