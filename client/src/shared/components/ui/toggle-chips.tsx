import type { ReactNode } from 'react';
import { cx } from '../../utils/cx';

export interface ToggleChipOption<TValue> {
  readonly value: TValue;
  readonly label: ReactNode;
  readonly key: string;
}

export interface ToggleChipsProps<TValue> {
  readonly legend: string;
  readonly options: readonly ToggleChipOption<TValue>[];
  readonly isActive: (value: TValue) => boolean;
  readonly onToggle: (value: TValue) => void;
  readonly stack?: boolean;
  readonly className?: string;
}

/**
 * Hàng chip lọc dùng `aria-pressed` thay vì radio: bấm lại chip đang chọn là bỏ
 * chọn, thứ mà nhóm radio không làm được.
 */
export const ToggleChips = <TValue,>({
  legend,
  options,
  isActive,
  onToggle,
  stack,
  className,
}: ToggleChipsProps<TValue>) => (
  <div className={cx('filter-group', className)} role="group" aria-label={legend}>
    <p className="filter-group__legend">{legend}</p>
    <div className={cx('chip-row', stack === true && 'chip-row--stack')}>
      {options.map((option) => (
        <button
          key={option.key}
          type="button"
          className="chip-btn"
          aria-pressed={isActive(option.value)}
          onClick={() => onToggle(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  </div>
);
