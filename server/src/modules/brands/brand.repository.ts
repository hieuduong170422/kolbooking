import type { Brand, BrandStatus, BrandVerificationDoc } from './brand.types.js';

/** Repository Pattern — in-memory cho MVP, PostgreSQL thay sau (P6). */
export interface BrandRepository {
  findById(id: string): Promise<Brand | null>;
  findByUserId(userId: string): Promise<Brand | null>;
  /** Tạo hồ sơ mới — id do repository sinh (brd_ + uuid). */
  create(input: Brand): Promise<Brand>;
  /** Full replace theo id — null khi không tồn tại. */
  update(id: string, input: Brand): Promise<Brand | null>;
  /** Admin queue — brand theo trạng thái (BRD-007). */
  findByStatus(statuses: readonly BrandStatus[]): Promise<readonly Brand[]>;
  /** Thêm tài liệu xác minh (BRD-003) — null khi brand không tồn tại. */
  addVerificationDoc(brandId: string, doc: BrandVerificationDoc): Promise<Brand | null>;
}
