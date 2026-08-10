import type { SocialPlatform } from '../../creators/types/creator-types';

/** Mirror server package.types.ts — PKG-001..PKG-008. */

export const DELIVERABLE_TYPES = ['video', 'photo', 'post', 'story'] as const;
export type DeliverableType = (typeof DELIVERABLE_TYPES)[number];

export const ADD_ON_TYPES = [
  'fast_delivery',
  'raw_files',
  'extra_revision',
  'extra_platform',
  'paid_usage',
] as const;
export type AddOnType = (typeof ADD_ON_TYPES)[number];

export const PACKAGE_STATUSES = ['draft', 'published', 'unpublished', 'hidden'] as const;
export type PackageStatus = (typeof PACKAGE_STATUSES)[number];

export interface PackageDeliverable {
  readonly type: DeliverableType;
  readonly quantity: number;
  readonly description: string;
  readonly postedOnCreatorChannel: boolean;
}

export interface UsageRights {
  readonly repost: boolean;
  readonly paidAds: boolean;
  readonly durationMonths: number | null;
  readonly channels: readonly string[];
}

export interface PackageAddOn {
  readonly id: string;
  readonly type: AddOnType;
  readonly label: string;
  readonly priceVnd: number;
}

/** DTO chính chủ (owner). */
export interface PackageOwner {
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

/** DTO admin — như owner nhưng kèm tên creator (PKG-010). */
export interface PackageAdmin extends PackageOwner {
  readonly creatorName: string;
}

/** DTO public — không status/version. */
export interface PackagePublic {
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

/** Input tạo/sửa package — add-on không có id (server sinh). */
export interface PackageInput {
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
  readonly addOns: readonly Omit<PackageAddOn, 'id'>[];
}

export const PACKAGE_STATUS_LABELS: Record<PackageStatus, string> = {
  draft: 'Bản nháp',
  published: 'Đang bán',
  unpublished: 'Đã gỡ',
  hidden: 'Bị ẩn (admin)',
};

export const DELIVERABLE_TYPE_LABELS: Record<DeliverableType, string> = {
  video: 'Video',
  photo: 'Ảnh',
  post: 'Bài đăng',
  story: 'Story',
};

export const ADD_ON_TYPE_LABELS: Record<AddOnType, string> = {
  fast_delivery: 'Giao nhanh',
  raw_files: 'File gốc',
  extra_revision: 'Thêm lần sửa',
  extra_platform: 'Thêm nền tảng',
  paid_usage: 'Quyền chạy quảng cáo',
};
