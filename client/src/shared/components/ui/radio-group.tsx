import { type ReactNode } from 'react';
import { cx } from '../../utils/cx';

export interface ChoiceOption<TValue extends string> {
  readonly value: TValue;
  readonly label: ReactNode;
  readonly disabled?: boolean;
}

export interface RadioGroupProps<TValue extends string> {
  readonly legend: ReactNode;
  readonly name: string;
  readonly value: TValue | undefined;
  readonly options: readonly ChoiceOption<TValue>[];
  readonly onChange: (value: TValue) => void;
  readonly disabled?: boolean;
  readonly className?: string;
}

/** Nhóm chọn-một dạng radio truyền thống, dùng khi số lựa chọn ít và ngắn. */
export const RadioGroup = <TValue extends string>({
  legend,
  name,
  value,
  options,
  onChange,
  disabled,
  className,
}: RadioGroupProps<TValue>) => (
  <fieldset className={cx('radio-group', className)}>
    <legend>{legend}</legend>
    {options.map((option) => (
      <label key={option.value} className="radio-option">
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
  </fieldset>
);
