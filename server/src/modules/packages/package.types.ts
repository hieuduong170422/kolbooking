import type { SocialPlatform } from '../creators/creator.types.js';

/** Loại deliverable trong package (PKG-002). */
export const DELIVERABLE_TYPES = ['video', 'photo', 'post', 'story'] as const;
export type DeliverableType = (typeof DELIVERABLE_TYPES)[number];

/** Loại add-on chuẩn hóa (PKG-006). */
export const ADD_ON_TYPES = [
  'fast_delivery',
  'raw_files',
  'extra_revision',
  'extra_platform',
  'paid_usage',
] as const;
export type AddOnType = (typeof ADD_ON_TYPES)[number];

/**
 * Trạng thái package (PKG-007, PKG-010):
 * draft → published ⇄ unpublished; hidden chỉ do admin (kèm lý do).
 * Admin unhide đưa về unpublished — creator chủ động publish lại.
 */
export const PACKAGE_STATUSES = ['draft', 'published', 'unpublished', 'hidden'] as const;
export type PackageStatus = (typeof PACKAGE_STATUSES)[number];

/** Một đầu ra phải bàn giao: loại, số lượng, mô tả format và nơi đăng (PKG-002). */
export interface PackageDeliverable {
  readonly type: DeliverableType;
  readonly quantity: number;
  /** Duration/format tự do: "video 30-60s dọc", "bộ 10 ảnh"... */
  readonly description: string;
  /** true = đăng trên kênh creator; false = UGC bàn giao cho brand. */
  readonly postedOnCreatorChannel: boolean;
}

/** Quyền sử dụng nội dung brand nhận được (PKG-004). */
export interface UsageRights {
  readonly repost: boolean;
  readonly paidAds: boolean;
  /** Số tháng brand được dùng nội dung; null = không giới hạn. */
  readonly durationMonths: number | null;
  /** Phạm vi kênh brand được dùng lại (vd facebook, tiktok, website). */
  readonly channels: readonly string[];
}

/** Add-on thay đổi tổng tiền ở checkout (PKG-006). */
export interface PackageAddOn {
  readonly id: string;
  readonly type: AddOnType;
  readonly label: string;
  readonly priceVnd: number;
}

/** Domain entity — gói dịch vụ chuẩn hóa của creator (PKG-001..PKG-008). */
export interface ServicePackage {
  readonly id: string;
  readonly creatorId: string;
  readonly name: string;
  readonly category: string;
  readonly platforms: readonly SocialPlatform[];
  readonly description: string;
  readonly coverImageUrl: string | null;
  readonly deliverables: readonly PackageDeliverable[];
  /** Giá cơ bản, đơn vị VND (BR-004: số nguyên, đơn vị nhỏ nhất). */
  readonly priceVnd: number;
  readonly turnaroundDays: number;
  readonly revisionsIncluded: number;
  readonly usageRights: UsageRights;
  /** Số ngày bài đăng phải duy trì công khai; null = không cam kết (PKG-005). */
  readonly postDurationDays: number | null;
  readonly addOns: readonly PackageAddOn[];
  readonly status: PackageStatus;
  /** Lý do admin ẩn package (PKG-010). */
  readonly statusReason: string | null;
  /** Tăng mỗi lần sửa sau khi đã publish — booking snapshot theo version (PKG-008). */
  readonly version: number;
  readonly createdAt: string;
  readonly updatedAt: string;
}

/** DTO chính chủ — creator quản lý package của mình. */
export interface PackageOwnerDto {
  readonly id: string;
  readonly creatorId: string;
  readonly name: string;
  readonly category: string;
  readonly platforms: readonly SocialPlatform[];
  readonly description: string;
  readonly coverImageUrl: string | null;
  readonly deliverables: readonly PackageDeliverable[];
  readonly priceVnd: number;
  readonly turnaroundDays: number;
  readonly revisionsIncluded: number;
  readonly usageRights: UsageRights;
  readonly postDurationDays: number | null;
  readonly addOns: readonly PackageAddOn[];
  readonly status: PackageStatus;
  readonly statusReason: string | null;
  readonly version: number;
  readonly createdAt: string;
  readonly updatedAt: string;
}

/** Public DTO — chỉ package published mới ra ngoài; không status/statusReason. */
export interface PackagePublicDto {
  readonly id: string;
  readonly creatorId: string;
  readonly name: string;
  readonly category: string;
  readonly platforms: readonly SocialPlatform[];
  readonly description: string;
  readonly coverImageUrl: string | null;
  readonly deliverables: readonly PackageDeliverable[];
  readonly priceVnd: number;
  readonly turnaroundDays: number;
  readonly revisionsIncluded: number;
  readonly usageRights: UsageRights;
  readonly postDurationDays: number | null;
  readonly addOns: readonly PackageAddOn[];
}

/** Input tạo/sửa package (PKG-001..PKG-006) — add-on id do server sinh. */
export interface PackageInput {
  readonly name: string;
  readonly category: string;
  readonly platforms: readonly SocialPlatform[];
  readonly description: string;
  readonly coverImageUrl?: string | null | undefined;
  readonly deliverables: readonly PackageDeliverable[];
  readonly priceVnd: number;
  readonly turnaroundDays: number;
  readonly revisionsIncluded: number;
  readonly usageRights: UsageRights;
  readonly postDurationDays?: number | null | undefined;
  readonly addOns: readonly Omit<PackageAddOn, 'id'>[];
}

export interface PackageListFilter {
  readonly creatorId: string;
  readonly page: number;
  readonly limit: number;
}

/** Bộ lọc cho màn moderation của admin — mọi creator, mọi trạng thái (PKG-010). */
export interface PackageAdminFilter {
  readonly status?: PackageStatus | undefined;
  readonly page: number;
  readonly limit: number;
}

/** DTO admin — kèm tên creator để đội duyệt biết package của ai. */
export interface PackageAdminDto extends PackageOwnerDto {
  readonly creatorName: string;
}

export interface PackageListResult {
  readonly items: readonly ServicePackage[];
  readonly total: number;
}
