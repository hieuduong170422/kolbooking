import type { ServicePackage } from './package.types.js';

const SEEDED_AT = '2026-08-01T08:00:00.000Z';

/**
 * Package demo cho creator seed (crt_0001..crt_0004 — verified).
 * Giá thấp nhất của mỗi creator KHỚP priceFromVnd trong creator.seed.ts.
 */
export const PACKAGE_SEED: readonly ServicePackage[] = [
  {
    id: 'pkg_0001',
    creatorId: 'crt_0001',
    name: 'Video review quán — Gói Cơ bản',
    category: 'f&b',
    platforms: ['tiktok'],
    description:
      'Một video review 30-60s quay dọc tại quán: giới thiệu không gian, món signature và trải nghiệm thực tế. Đăng trên kênh TikTok của creator kèm caption tối ưu.',
    coverImageUrl: null,
    deliverables: [
      {
        type: 'video',
        quantity: 1,
        description: 'Video 30-60s dọc 9:16, đăng kênh creator',
        postedOnCreatorChannel: true,
      },
    ],
    priceVnd: 1_500_000,
    turnaroundDays: 5,
    revisionsIncluded: 1,
    usageRights: { repost: true, paidAds: false, durationMonths: 3, channels: ['facebook', 'website'] },
    postDurationDays: 90,
    addOns: [
      { id: 'ado_0001', type: 'fast_delivery', label: 'Giao nhanh 48h', priceVnd: 300_000 },
      { id: 'ado_0002', type: 'raw_files', label: 'File gốc không logo', priceVnd: 500_000 },
    ],
    status: 'published',
    statusReason: null,
    version: 1,
    createdAt: SEEDED_AT,
    updatedAt: SEEDED_AT,
  },
  {
    id: 'pkg_0002',
    creatorId: 'crt_0001',
    name: 'Combo 3 video + bộ ảnh UGC',
    category: 'f&b',
    platforms: ['tiktok', 'instagram'],
    description:
      'Combo 3 video ngắn theo 3 góc nội dung khác nhau kèm bộ 10 ảnh UGC bàn giao cho brand sử dụng trên kênh riêng. Phù hợp chiến dịch khai trương hoặc ra món mới.',
    coverImageUrl: null,
    deliverables: [
      {
        type: 'video',
        quantity: 3,
        description: 'Video 30-60s dọc, 3 concept khác nhau',
        postedOnCreatorChannel: true,
      },
      {
        type: 'photo',
        quantity: 10,
        description: 'Bộ ảnh UGC chụp món + không gian, bàn giao file',
        postedOnCreatorChannel: false,
      },
    ],
    priceVnd: 4_200_000,
    turnaroundDays: 10,
    revisionsIncluded: 2,
    usageRights: { repost: true, paidAds: true, durationMonths: 6, channels: ['facebook', 'tiktok', 'website'] },
    postDurationDays: 90,
    addOns: [
      { id: 'ado_0003', type: 'extra_revision', label: 'Thêm 1 vòng sửa', priceVnd: 400_000 },
    ],
    status: 'published',
    statusReason: null,
    version: 1,
    createdAt: SEEDED_AT,
    updatedAt: SEEDED_AT,
  },
  {
    id: 'pkg_0003',
    creatorId: 'crt_0002',
    name: 'Bài đăng + story trải nghiệm dịch vụ',
    category: 'lifestyle',
    platforms: ['instagram'],
    description:
      'Một bài đăng feed kèm 3 story trải nghiệm dịch vụ tại chỗ, tag địa điểm và nhắc tên brand tự nhiên trong nội dung. Nhắm tệp follower nữ 20-30 tuổi khu vực Hà Nội.',
    coverImageUrl: null,
    deliverables: [
      {
        type: 'post',
        quantity: 1,
        description: 'Bài đăng feed kèm caption + hashtag',
        postedOnCreatorChannel: true,
      },
      {
        type: 'story',
        quantity: 3,
        description: 'Story dọc có sticker link/địa điểm',
        postedOnCreatorChannel: true,
      },
    ],
    priceVnd: 900_000,
    turnaroundDays: 4,
    revisionsIncluded: 1,
    usageRights: { repost: true, paidAds: false, durationMonths: null, channels: ['facebook'] },
    postDurationDays: 30,
    addOns: [],
    status: 'published',
    statusReason: null,
    version: 1,
    createdAt: SEEDED_AT,
    updatedAt: SEEDED_AT,
  },
  {
    id: 'pkg_0004',
    creatorId: 'crt_0003',
    name: 'Video dài YouTube + đặt sản phẩm',
    category: 'tech',
    platforms: ['youtube'],
    description:
      'Đặt sản phẩm trong video YouTube dài 8-12 phút của kênh: giới thiệu 60-90s ở nửa đầu video kèm link ở mô tả. Kịch bản gửi brand duyệt trước khi quay.',
    coverImageUrl: null,
    deliverables: [
      {
        type: 'video',
        quantity: 1,
        description: 'Product placement 60-90s trong video dài',
        postedOnCreatorChannel: true,
      },
    ],
    priceVnd: 5_000_000,
    turnaroundDays: 14,
    revisionsIncluded: 1,
    usageRights: { repost: false, paidAds: false, durationMonths: null, channels: [] },
    postDurationDays: 180,
    addOns: [
      { id: 'ado_0004', type: 'paid_usage', label: 'Quyền chạy quảng cáo 3 tháng', priceVnd: 2_000_000 },
    ],
    status: 'published',
    statusReason: null,
    version: 1,
    createdAt: SEEDED_AT,
    updatedAt: SEEDED_AT,
  },
  {
    id: 'pkg_0005',
    creatorId: 'crt_0004',
    name: 'Bộ ảnh UGC theo brief',
    category: 'f&b',
    platforms: ['facebook'],
    description:
      'Bộ 15 ảnh UGC chụp theo brief của brand (sản phẩm, lifestyle, cận cảnh). Bàn giao file chỉnh màu, brand toàn quyền dùng trên kênh riêng trong 12 tháng.',
    coverImageUrl: null,
    deliverables: [
      {
        type: 'photo',
        quantity: 15,
        description: 'Ảnh chỉnh màu, file JPG chất lượng cao',
        postedOnCreatorChannel: false,
      },
    ],
    priceVnd: 700_000,
    turnaroundDays: 7,
    revisionsIncluded: 2,
    usageRights: { repost: true, paidAds: true, durationMonths: 12, channels: ['facebook', 'instagram', 'website'] },
    postDurationDays: null,
    addOns: [],
    status: 'published',
    statusReason: null,
    version: 1,
    createdAt: SEEDED_AT,
    updatedAt: SEEDED_AT,
  },
];
