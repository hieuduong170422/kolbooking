import type { Brand } from './brand.types.js';

const SEEDED_AT = '2026-08-01T08:00:00.000Z';

/** Brand demo liên kết usr_demo_brand — verified sẵn để demo flow booking (P3). */
export const BRAND_SEED: readonly Brand[] = [
  {
    id: 'brd_demo',
    userId: 'usr_demo_brand',
    name: 'The Morning Cafe',
    logoUrl: null,
    industry: 'f&b',
    website: 'https://themorningcafe.example.vn',
    socialLinks: ['https://www.facebook.com/themorningcafe'],
    businessAddress: '12 Phố Hàng Bông, Hoàn Kiếm, Hà Nội',
    entityType: 'household',
    status: 'verified',
    statusReason: null,
    verificationDocs: [],
    contact: {
      name: 'Trần Thu Hà',
      email: 'ha.tran@themorningcafe.example.vn',
      phone: '0912345678',
    },
    createdAt: SEEDED_AT,
  },
];
