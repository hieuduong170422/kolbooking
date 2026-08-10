import type {
  PackageOwnerDto,
  PackagePublicDto,
  ServicePackage,
} from './package.types.js';

/** DTO chính chủ — đủ trạng thái + version để quản lý. */
export const toPackageOwnerDto = (pkg: ServicePackage): PackageOwnerDto => ({
  id: pkg.id,
  creatorId: pkg.creatorId,
  name: pkg.name,
  category: pkg.category,
  platforms: pkg.platforms,
  description: pkg.description,
  coverImageUrl: pkg.coverImageUrl,
  deliverables: pkg.deliverables,
  priceVnd: pkg.priceVnd,
  turnaroundDays: pkg.turnaroundDays,
  revisionsIncluded: pkg.revisionsIncluded,
  usageRights: pkg.usageRights,
  postDurationDays: pkg.postDurationDays,
  addOns: pkg.addOns,
  status: pkg.status,
  statusReason: pkg.statusReason,
  version: pkg.version,
  createdAt: pkg.createdAt,
  updatedAt: pkg.updatedAt,
});

/** Public DTO — chỉ dữ liệu hiển thị, không status/statusReason/version. */
export const toPackagePublicDto = (pkg: ServicePackage): PackagePublicDto => ({
  id: pkg.id,
  creatorId: pkg.creatorId,
  name: pkg.name,
  category: pkg.category,
  platforms: pkg.platforms,
  description: pkg.description,
  coverImageUrl: pkg.coverImageUrl,
  deliverables: pkg.deliverables,
  priceVnd: pkg.priceVnd,
  turnaroundDays: pkg.turnaroundDays,
  revisionsIncluded: pkg.revisionsIncluded,
  usageRights: pkg.usageRights,
  postDurationDays: pkg.postDurationDays,
  addOns: pkg.addOns,
});
