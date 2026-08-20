import { describe, expect, it } from 'vitest';
import { estimateTotals } from './pricing';
import { effectiveTurnaroundDays } from './deadline';
import { FALLBACK_CONFIG } from '../config/types/config-types';
import type { PackageAddOn } from '../packages/types/package-types';

const addOn = (type: PackageAddOn['type']): PackageAddOn => ({
  id: `ado_${type}`,
  type,
  label: type,
  priceVnd: 300_000,
});

describe('estimateTotals — brand phải thấy tổng thật trước khi bấm tạo', () => {
  it('phí theo phần trăm khi vượt mức sàn', () => {
    // pkg_0001 giá 1.500.000, phí 12% = 180.000.
    expect(estimateTotals(1_500_000, FALLBACK_CONFIG)).toEqual({
      subtotalVnd: 1_500_000,
      platformFeeVnd: 180_000,
      totalVnd: 1_680_000,
    });
  });

  it('gói nhỏ dùng mức phí sàn', () => {
    expect(estimateTotals(100_000, FALLBACK_CONFIG).platformFeeVnd).toBe(50_000);
  });

  it('add-on cộng vào tổng nên cũng cộng vào phí', () => {
    expect(estimateTotals(2_300_000, FALLBACK_CONFIG).totalVnd).toBe(2_300_000 + 276_000);
  });
});

describe('effectiveTurnaroundDays — add-on giao nhanh phải rút ngắn thật', () => {
  const fastDays = FALLBACK_CONFIG.fastDeliveryTurnaroundDays;

  it('không chọn add-on → giữ nguyên', () => {
    expect(effectiveTurnaroundDays(5, [], fastDays)).toBe(5);
    expect(effectiveTurnaroundDays(5, [addOn('raw_files')], fastDays)).toBe(5);
  });

  it('chọn giao nhanh → rút xuống theo cấu hình server', () => {
    expect(effectiveTurnaroundDays(5, [addOn('fast_delivery')], fastDays)).toBe(2);
  });

  it('gói vốn đã nhanh hơn → add-on không kéo dài ngược lại', () => {
    expect(effectiveTurnaroundDays(1, [addOn('fast_delivery')], fastDays)).toBe(1);
  });
});
