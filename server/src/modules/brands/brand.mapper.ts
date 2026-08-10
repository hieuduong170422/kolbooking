import type { Brand, BrandAdminDto, BrandOwnerDto } from './brand.types.js';

/** DTO chính chủ — không lộ userId; docs chỉ có metadata, không có đường dẫn file. */
export const toBrandOwnerDto = (brand: Brand): BrandOwnerDto => ({
  id: brand.id,
  name: brand.name,
  logoUrl: brand.logoUrl,
  industry: brand.industry,
  website: brand.website,
  socialLinks: brand.socialLinks,
  businessAddress: brand.businessAddress,
  entityType: brand.entityType,
  status: brand.status,
  statusReason: brand.statusReason,
  verificationDocs: brand.verificationDocs.map((doc) => ({
    id: doc.id,
    fileName: doc.fileName,
    // storageKey giữ nguyên trong entity; DTO không cần lộ key thật — nhưng
    // admin/owner tải file qua endpoint theo docId nên key không dùng ở client.
    storageKey: '',
    uploadedAt: doc.uploadedAt,
  })),
  contact: brand.contact,
  createdAt: brand.createdAt,
});

export const toBrandAdminDto = (brand: Brand, userEmail: string): BrandAdminDto => ({
  ...toBrandOwnerDto(brand),
  userEmail,
});
