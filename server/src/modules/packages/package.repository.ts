import type {
  PackageAdminFilter,
  PackageListFilter,
  PackageListResult,
  ServicePackage,
} from './package.types.js';

/**
 * Repository Pattern — business logic chỉ phụ thuộc interface.
 * In-memory cho MVP; PostgreSQL thay implementation sau (P6).
 */
export interface PackageRepository {
  /** Danh sách package PUBLISHED của một creator, có phân trang (public). */
  findPublishedByCreator(filter: PackageListFilter): Promise<PackageListResult>;
  /** Toàn bộ package của creator, mọi trạng thái (owner). */
  findAllByCreator(creatorId: string): Promise<readonly ServicePackage[]>;
  findById(id: string): Promise<ServicePackage | null>;
  /** Mọi package của mọi creator — chỉ dùng cho moderation admin (PKG-010). */
  findAllForAdmin(filter: PackageAdminFilter): Promise<PackageListResult>;
  /** Tạo mới — id (pkg_ + uuid) và id add-on do repository sinh. */
  create(input: ServicePackage): Promise<ServicePackage>;
  /** Full replace theo id — null khi không tồn tại. */
  update(id: string, input: ServicePackage): Promise<ServicePackage | null>;
  /** Xóa cứng — chỉ service gọi cho package draft (chưa từng có booking). */
  delete(id: string): Promise<boolean>;
}
