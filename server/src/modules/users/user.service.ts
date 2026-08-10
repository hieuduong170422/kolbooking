import { ApiError } from '../../shared/errors/api-error.js';
import type { AuditRepository } from '../audit/audit.repository.js';
import type { SessionRepository } from '../auth/session.repository.js';
import { toUserAdminDto } from './user.mapper.js';
import type { UserRepository } from './user.repository.js';
import type { User, UserAdminDto, UserListFilter } from './user.types.js';

export interface UserListPage {
  readonly items: readonly UserAdminDto[];
  readonly total: number;
  readonly page: number;
  readonly limit: number;
}

/**
 * Quản lý tài khoản cho admin (ADM-002, ADM-004, AUTH-006).
 *
 * Khóa TÀI KHOẢN khác tạm khóa HỒ SƠ creator/brand: tài khoản bị khóa
 * không đăng nhập được và mọi phiên đang mở bị thu hồi ngay.
 * Mọi thao tác đều bắt buộc lý do và ghi audit append-only (BR-014, BR-015).
 */
export class UserAdminService {
  private readonly users: UserRepository;
  private readonly sessions: SessionRepository;
  private readonly audit: AuditRepository;

  constructor(users: UserRepository, sessions: SessionRepository, audit: AuditRepository) {
    this.users = users;
    this.sessions = sessions;
    this.audit = audit;
  }

  async list(filter: UserListFilter): Promise<UserListPage> {
    const { items, total } = await this.users.findAll(filter);
    return {
      items: items.map(toUserAdminDto),
      total,
      page: filter.page,
      limit: filter.limit,
    };
  }

  /** Khóa tài khoản + thu hồi toàn bộ phiên đăng nhập (AUTH-006). */
  async lock(adminUserId: string, userId: string, reason: string): Promise<UserAdminDto> {
    const user = await this.requireUser(userId);
    this.assertNotAdminAccount(user);
    if (user.status === 'locked') {
      throw ApiError.conflict('Tài khoản đã bị khóa trước đó.');
    }

    const updated = await this.applyStatus(userId, 'locked');
    // Thu hồi phiên NGAY — nếu chỉ đổi status, access token cũ vẫn dùng được tới khi hết hạn.
    await this.sessions.revokeAllForUser(userId);

    await this.audit.create({
      actorId: adminUserId,
      action: 'user.lock',
      targetType: 'user',
      targetId: userId,
      before: user.status,
      after: updated.status,
      reason,
    });
    return toUserAdminDto(updated);
  }

  async unlock(adminUserId: string, userId: string): Promise<UserAdminDto> {
    const user = await this.requireUser(userId);
    if (user.status !== 'locked') {
      throw ApiError.conflict('Tài khoản đang hoạt động, không cần mở khóa.');
    }

    const updated = await this.applyStatus(userId, 'active');
    await this.audit.create({
      actorId: adminUserId,
      action: 'user.unlock',
      targetType: 'user',
      targetId: userId,
      before: user.status,
      after: updated.status,
      reason: null,
    });
    return toUserAdminDto(updated);
  }

  private async requireUser(userId: string): Promise<User> {
    const user = await this.users.findById(userId);
    if (!user) {
      throw ApiError.notFound('Không tìm thấy người dùng này.');
    }
    return user;
  }

  /**
   * Không cho khóa tài khoản admin — kể cả chính mình. MVP chưa có
   * maker-checker (BR-014) nên chặn hẳn để tránh tự khóa mất quyền vận hành.
   */
  private assertNotAdminAccount(user: User): void {
    if (user.role === 'admin') {
      throw ApiError.forbidden('Không thể khóa tài khoản quản trị.');
    }
  }

  private async applyStatus(userId: string, status: 'active' | 'locked'): Promise<User> {
    const updated = await this.users.update(userId, { status });
    if (!updated) {
      throw ApiError.internal('Không tìm thấy tài khoản để cập nhật.');
    }
    return updated;
  }
}
