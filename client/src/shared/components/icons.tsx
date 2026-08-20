import type { SVGProps } from 'react';

/**
 * Bộ icon SVG inline dùng chung — stroke theo currentColor để ăn màu context.
 * Mọi icon đều aria-hidden (trang trí); ý nghĩa nằm ở text đi kèm.
 */
const base = (props: SVGProps<SVGSVGElement>) =>
  ({
    width: 18,
    height: 18,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    'aria-hidden': true,
    ...props,
  }) as const;

export const IconSearch = (props: SVGProps<SVGSVGElement>) => (
  <svg {...base(props)}>
    <circle cx="11" cy="11" r="7" />
    <path d="m21 21-4.3-4.3" />
  </svg>
);

export const IconStar = (props: SVGProps<SVGSVGElement>) => (
  <svg {...base(props)} fill="currentColor" stroke="none">
    <path d="M12 2.5l2.9 5.9 6.5.95-4.7 4.6 1.1 6.5L12 17.4l-5.8 3.05 1.1-6.5-4.7-4.6 6.5-.95z" />
  </svg>
);

/**
 * Trái tim rỗng và trái tim đặc dùng CHUNG một path — chỉ khác fill.
 * Trước đây dùng ký tự ♡ và ♥: hai glyph này thuộc hai vùng Unicode khác nhau
 * nên font vẽ ra hai hình dáng và hai cỡ khác hẳn, bật/tắt là thấy nhảy.
 */
const HEART_PATH =
  'M12 20.3 4.4 12.9a4.6 4.6 0 0 1 0-6.6 4.9 4.9 0 0 1 6.8 0l.8.8.8-.8a4.9 4.9 0 0 1 6.8 0 4.6 4.6 0 0 1 0 6.6z';

export const IconHeart = (props: SVGProps<SVGSVGElement>) => (
  <svg {...base(props)}>
    <path d={HEART_PATH} />
  </svg>
);

export const IconHeartFilled = (props: SVGProps<SVGSVGElement>) => (
  <svg {...base(props)} fill="currentColor">
    <path d={HEART_PATH} />
  </svg>
);

export const IconMapPin = (props: SVGProps<SVGSVGElement>) => (
  <svg {...base(props)}>
    <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
    <circle cx="12" cy="10" r="3" />
  </svg>
);

export const IconPackage = (props: SVGProps<SVGSVGElement>) => (
  <svg {...base(props)}>
    <path d="m7.5 4.27 9 5.15" />
    <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
    <path d="m3.3 7 8.7 5 8.7-5" />
    <path d="M12 22V12" />
  </svg>
);

export const IconUser = (props: SVGProps<SVGSVGElement>) => (
  <svg {...base(props)}>
    <circle cx="12" cy="8" r="4" />
    <path d="M4 21c0-4 3.6-6 8-6s8 2 8 6" />
  </svg>
);

export const IconBriefcase = (props: SVGProps<SVGSVGElement>) => (
  <svg {...base(props)}>
    <rect x="3" y="7" width="18" height="13" rx="2" />
    <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    <path d="M3 13h18" />
  </svg>
);

export const IconShield = (props: SVGProps<SVGSVGElement>) => (
  <svg {...base(props)}>
    <path d="M12 2 4 5v6c0 5.5 3.4 9.7 8 11 4.6-1.3 8-5.5 8-11V5Z" />
    <path d="m9 12 2 2 4-4" />
  </svg>
);

export const IconClock = (props: SVGProps<SVGSVGElement>) => (
  <svg {...base(props)}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3 2" />
  </svg>
);

export const IconRefresh = (props: SVGProps<SVGSVGElement>) => (
  <svg {...base(props)}>
    <path d="M21 12a9 9 0 1 1-2.6-6.4" />
    <path d="M21 3v6h-6" />
  </svg>
);

export const IconCheck = (props: SVGProps<SVGSVGElement>) => (
  <svg {...base(props)}>
    <path d="m5 12.5 4.5 4.5L19 7" />
  </svg>
);

export const IconTrash = (props: SVGProps<SVGSVGElement>) => (
  <svg {...base(props)}>
    <path d="M4 7h16" />
    <path d="M10 11v6M14 11v6" />
    <path d="M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12" />
    <path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" />
  </svg>
);

export const IconUpload = (props: SVGProps<SVGSVGElement>) => (
  <svg {...base(props)}>
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <path d="m7 9 5-5 5 5" />
    <path d="M12 4v12" />
  </svg>
);

export const IconPlus = (props: SVGProps<SVGSVGElement>) => (
  <svg {...base(props)}>
    <path d="M12 5v14M5 12h14" />
  </svg>
);

export const IconLink = (props: SVGProps<SVGSVGElement>) => (
  <svg {...base(props)}>
    <path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.5 1.5" />
    <path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.5-1.5" />
  </svg>
);

export const IconInbox = (props: SVGProps<SVGSVGElement>) => (
  <svg {...base(props)}>
    <path d="M22 12h-6l-2 3h-4l-2-3H2" />
    <path d="M5.5 5 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6L18.5 5a2 2 0 0 0-1.8-1H7.3a2 2 0 0 0-1.8 1Z" />
  </svg>
);

export const IconMenu = (props: SVGProps<SVGSVGElement>) => (
  <svg {...base(props)}>
    <path d="M4 7h16" />
    <path d="M4 12h16" />
    <path d="M4 17h16" />
  </svg>
);

export const IconClose = (props: SVGProps<SVGSVGElement>) => (
  <svg {...base(props)}>
    <path d="M6 6l12 12" />
    <path d="M18 6 6 18" />
  </svg>
);
