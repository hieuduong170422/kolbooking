import { randomUUID } from 'node:crypto';
import { queryPage } from '../../shared/db/paginate.js';
import type { Db } from '../../shared/db/pool.js';
import type { UserRepository } from './user.repository.js';
import type {
  CreateUserInput,
  User,
  UserConsent,
  UserListFilter,
  UserListResult,
  UserPatch,
  UserRole,
  UserStatus,
} from './user.types.js';

interface UserRow {
  readonly id: string;
  readonly email: string;
  readonly password_hash: string;
  readonly display_name: string;
  readonly role: string;
  readonly status: string;
  readonly email_verified_at: string | null;
  readonly consent: UserConsent | null;
  readonly created_at: string;
}

const toUser = (row: UserRow): User => ({
  id: row.id,
  email: row.email,
  passwordHash: row.password_hash,
  displayName: row.display_name,
  role: row.role as UserRole,
  status: row.status as UserStatus,
  emailVerifiedAt: row.email_verified_at,
  consent: row.consent,
  createdAt: row.created_at,
});

const COLUMNS =
  'id, email, password_hash, display_name, role, status, email_verified_at, consent, created_at';

/** PostgreSQL implementation — email so sánh không phân biệt hoa thường. */
export class PostgresUserRepository implements UserRepository {
  constructor(private readonly db: Db) {}

  async findById(id: string): Promise<User | null> {
    const { rows } = await this.db.query<UserRow>(
      `SELECT ${COLUMNS} FROM users WHERE id = $1`,
      [id],
    );
    const row = rows[0];
    return row ? toUser(row) : null;
  }

  async findByEmail(email: string): Promise<User | null> {
    const { rows } = await this.db.query<UserRow>(
      `SELECT ${COLUMNS} FROM users WHERE lower(email) = lower($1)`,
      [email],
    );
    const row = rows[0];
    return row ? toUser(row) : null;
  }

  async create(input: CreateUserInput): Promise<User> {
    const user: User = {
      id: `usr_${randomUUID()}`,
      email: input.email.toLowerCase(),
      passwordHash: input.passwordHash,
      displayName: input.displayName,
      role: input.role,
      status: 'active',
      emailVerifiedAt: null,
      consent: input.consent,
      createdAt: new Date().toISOString(),
    };
    await this.db.query(
      `INSERT INTO users (${COLUMNS}) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        user.id,
        user.email,
        user.passwordHash,
        user.displayName,
        user.role,
        user.status,
        user.emailVerifiedAt,
        JSON.stringify(user.consent),
        user.createdAt,
      ],
    );
    return user;
  }

  /**
   * Nạp tài khoản có sẵn id — chỉ dùng cho seed demo. Trùng id hoặc trùng
   * email đều bị bỏ qua để chạy lại nhiều lần vẫn an toàn.
   */
  async insertMany(users: readonly User[]): Promise<void> {
    for (const user of users) {
      await this.db.query(
        `INSERT INTO users (${COLUMNS}) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         ON CONFLICT DO NOTHING`,
        [
          user.id,
          user.email.toLowerCase(),
          user.passwordHash,
          user.displayName,
          user.role,
          user.status,
          user.emailVerifiedAt,
          JSON.stringify(user.consent),
          user.createdAt,
        ],
      );
    }
  }

  async findAll(filter: UserListFilter): Promise<UserListResult> {
    const conditions: string[] = [];
    const values: unknown[] = [];

    if (filter.role) {
      values.push(filter.role);
      conditions.push(`role = $${values.length}`);
    }
    if (filter.status) {
      values.push(filter.status);
      conditions.push(`status = $${values.length}`);
    }
    const keyword = filter.search?.trim();
    if (keyword) {
      // Khớp một phần email HOẶC tên hiển thị, không phân biệt hoa thường.
      values.push(`%${keyword}%`);
      conditions.push(`(email ILIKE $${values.length} OR display_name ILIKE $${values.length})`);
    }

    const page = await queryPage<UserRow>(this.db, {
      select: COLUMNS,
      from: 'users',
      where: conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '',
      // Mới nhất lên đầu — admin quan tâm tài khoản vừa đăng ký.
      orderBy: 'ORDER BY created_at DESC',
      values,
      page: filter.page,
      limit: filter.limit,
    });

    return { items: page.rows.map(toUser), total: page.total };
  }

  async update(id: string, patch: UserPatch): Promise<User | null> {
    const assignments: string[] = [];
    const values: unknown[] = [];

    if (patch.passwordHash !== undefined) {
      values.push(patch.passwordHash);
      assignments.push(`password_hash = $${values.length}`);
    }
    // Dùng `in` chứ không so undefined: đặt lại null là thao tác hợp lệ.
    if ('emailVerifiedAt' in patch) {
      values.push(patch.emailVerifiedAt ?? null);
      assignments.push(`email_verified_at = $${values.length}`);
    }
    if (patch.status !== undefined) {
      values.push(patch.status);
      assignments.push(`status = $${values.length}`);
    }

    if (assignments.length === 0) {
      return this.findById(id);
    }

    values.push(id);
    const { rows } = await this.db.query<UserRow>(
      `UPDATE users SET ${assignments.join(', ')} WHERE id = $${values.length} RETURNING ${COLUMNS}`,
      values,
    );
    const row = rows[0];
    return row ? toUser(row) : null;
  }
}
