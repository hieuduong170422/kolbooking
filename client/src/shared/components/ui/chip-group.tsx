import { cx } from '../../utils/cx';
import type { ChoiceOption } from './radio-group';

export interface ChipGroupProps<TValue extends string> {
  readonly legend: string;
  readonly value: readonly TValue[];
  readonly options: readonly ChoiceOption<TValue>[];
  readonly onChange: (value: readonly TValue[]) => void;
  readonly disabled?: boolean;
  readonly hint?: string;
  readonly className?: string;
}

/** Chọn-nhiều dạng chip bo tròn — nền tảng, ngày trong tuần, lĩnh vực... */
export const ChipGroup = <TValue extends string>({
  legend,
  value,
  options,
  onChange,
  disabled,
  hint,
  className,
}: ChipGroupProps<TValue>) => {
  const toggle = (option: TValue): void => {
    onChange(value.includes(option) ? value.filter((item) => item !== option) : [...value, option]);
  };

  return (
    <fieldset className={cx('chip-group', className)}>
      <legend className="form-field__label">{legend}</legend>
      {hint !== undefined ? <p className="onb-hint">{hint}</p> : null}
      <div className="chip-group__options">
        {options.map((option) => (
          <label key={option.value} className="chip-toggle">
            <input
              type="checkbox"
              checked={value.includes(option.value)}
              disabled={disabled === true || option.disabled === true}
              onChange={() => toggle(option.value)}
            />
            <span>{option.label}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
};
