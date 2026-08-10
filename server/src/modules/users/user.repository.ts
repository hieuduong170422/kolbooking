import type {
  CreateUserInput,
  User,
  UserListFilter,
  UserListResult,
  UserPatch,
} from './user.types.js';

export interface UserRepository {
  findById(id: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  create(input: CreateUserInput): Promise<User>;
  /** Trả về bản ghi sau cập nhật, hoặc null nếu user không tồn tại. */
  update(id: string, patch: UserPatch): Promise<User | null>;
  /** Danh sách cho admin — lọc + phân trang phía repository (ADM-002, NFR-P-05). */
  findAll(filter: UserListFilter): Promise<UserListResult>;
}
