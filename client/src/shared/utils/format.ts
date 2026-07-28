const vndFormatter = new Intl.NumberFormat('vi-VN', {
  style: 'currency',
  currency: 'VND',
  maximumFractionDigits: 0,
});

/** 1500000 → "1.500.000 ₫" */
export const formatVnd = (amountVnd: number): string => vndFormatter.format(amountVnd);

/** 48000 → "48K", 1200000 → "1.2M", 950 → "950" */
export const formatCompactNumber = (value: number): string => {
  if (value >= 1_000_000) {
    return `${trimTrailingZero((value / 1_000_000).toFixed(1))}M`;
  }
  if (value >= 1_000) {
    return `${trimTrailingZero((value / 1_000).toFixed(1))}K`;
  }
  return String(value);
};

const trimTrailingZero = (value: string): string => value.replace(/\.0$/, '');
