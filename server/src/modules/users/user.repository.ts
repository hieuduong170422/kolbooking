import type { CreateUserInput, User, UserPatch } from './user.types.js';

export interface UserRepository {
  findById(id: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  create(input: CreateUserInput): Promise<User>;
  /** Trả về bản ghi sau cập nhật, hoặc null nếu user không tồn tại. */
  update(id: string, patch: UserPatch): Promise<User | null>;
}
