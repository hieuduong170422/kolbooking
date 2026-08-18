import { cx } from '../../utils/cx';
import type { ChoiceOption } from './radio-group';

export interface SegmentedControlProps<TValue extends string> {
  readonly legend: string;
  readonly name: string;
  readonly value: TValue;
  readonly options: readonly ChoiceOption<TValue>[];
  readonly onChange: (value: TValue) => void;
  readonly disabled?: boolean;
  readonly hint?: string;
  readonly className?: string;
}

/**
 * Chọn-một dạng thanh phân đoạn. Bên dưới vẫn là radio nên bàn phím và trình
 * đọc màn hình dùng được như thường, chỉ phần hiện hình là nút bấm liền khối.
 */
export const SegmentedControl = <TValue extends string>({
  legend,
  name,
  value,
  options,
  onChange,
  disabled,
  hint,
  className,
}: SegmentedControlProps<TValue>) => (
  <fieldset className={cx('segmented', className)}>
    <legend className="form-field__label">{legend}</legend>
    {hint !== undefined ? <p className="onb-hint">{hint}</p> : null}
    <div className="segmented__options">
      {options.map((option) => (
        <label key={option.value} className="segmented__option">
          <input
            type="radio"
            name={name}
            value={option.value}
            checked={value === option.value}
            disabled={disabled === true || option.disabled === true}
            onChange={() => onChange(option.value)}
          />
          <span>{option.label}</span>
        </label>
      ))}
    </div>
  </fieldset>
);
