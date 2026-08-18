import type { ReactNode } from 'react';
import { cx } from '../../utils/cx';

export interface TabOption<TValue> {
  readonly key: string;
  readonly value: TValue;
  readonly label: ReactNode;
}

export interface TabsProps<TValue> {
  /** Nhãn cho cả nhóm — trình đọc màn hình đọc trước khi vào từng nút. */
  readonly label: string;
  readonly value: TValue;
  readonly options: readonly TabOption<TValue>[];
  readonly onChange: (value: TValue) => void;
  readonly className?: string;
}

/**
 * Dải nút lọc danh sách — hàng chờ duyệt, danh sách booking.
 *
 * Dùng `aria-pressed` chứ không phải `role="tab"`: đây là bộ lọc đổi nội dung
 * một danh sách, không có tabpanel cho tab trỏ tới, nên khai là tab sẽ nói dối
 * trình đọc màn hình về cấu trúc trang.
 */
export const Tabs = <TValue,>({ label, value, options, onChange, className }: TabsProps<TValue>) => (
  <div className={cx('review-tabs', className)} role="group" aria-label={label}>
    {options.map((option) => (
      <button
        key={option.key}
        type="button"
        aria-pressed={option.value === value}
        className={cx('review-tabs__tab', option.value === value && 'review-tabs__tab--active')}
        onClick={() => onChange(option.value)}
      >
        {option.label}
      </button>
    ))}
  </div>
);
