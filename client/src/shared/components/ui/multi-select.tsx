import { useId } from 'react';
import { cx } from '../../utils/cx';
import type { FieldSpan } from './field';
import { ListboxPanel } from './listbox-panel';
import { useListbox } from './use-listbox';

export interface MultiSelectProps {
  readonly label: string;
  readonly hint?: string;
  /** Toàn bộ mục chọn được — hiện đầy đủ trong dropdown. */
  readonly options: readonly string[];
  readonly value: readonly string[];
  readonly onChange: (next: readonly string[]) => void;
  /** Chữ trên nút khi chưa chọn mục nào. */
  readonly placeholder: string;
  readonly emptyMessage?: string;
  readonly disabled?: boolean;
  readonly span?: FieldSpan;
  readonly className?: string;
}

/** Đếm mục đã chọn — nút gọn, danh sách chi tiết nằm ở thẻ bên dưới. */
const summarize = (count: number): string => `Đã chọn ${count} mục`;

/**
 * Chọn nhiều mục từ một dropdown: danh sách đầy đủ nằm trong lớp nổi, mục đã
 * chọn hiện thành thẻ có dấu × ngay bên dưới.
 *
 * Không tự đóng sau mỗi lựa chọn — đây là chọn nhiều, đóng lại sẽ bắt người
 * dùng mở lại cho từng mục.
 */
export const MultiSelect = ({
  label,
  hint,
  options,
  value,
  onChange,
  placeholder,
  emptyMessage = 'Không có mục nào để chọn.',
  disabled,
  span,
  className,
}: MultiSelectProps) => {
  const baseId = useId();
  const labelId = `${baseId}-label`;
  const listId = `${baseId}-list`;
  const optionId = (index: number): string => `${baseId}-opt-${index}`;

  const listbox = useListbox({
    optionCount: options.length,
    closeOnPick: false,
    onPick: (index) => {
      const option = options[index];
      if (option === undefined) return;
      onChange(
        value.includes(option) ? value.filter((item) => item !== option) : [...value, option],
      );
    },
  });

  return (
    <div className={cx('form-field', span && `field--${span}`, 'multiselect', className)}>
      <span className="form-field__label" id={labelId}>
        {label}
      </span>
      {hint !== undefined && hint !== '' ? <p className="onb-hint">{hint}</p> : null}

      <div className="listbox" ref={listbox.containerRef}>
        <button
          type="button"
          role="combobox"
          className={cx('select', 'listbox__trigger', value.length === 0 && 'listbox__trigger--empty')}
          aria-labelledby={labelId}
          aria-expanded={listbox.open}
          aria-controls={listId}
          aria-haspopup="listbox"
          aria-activedescendant={listbox.open ? optionId(listbox.activeIndex) : undefined}
          disabled={disabled}
          onClick={listbox.toggleOpen}
          onKeyDown={listbox.handleKeyDown}
        >
          {value.length === 0 ? placeholder : summarize(value.length)}
        </button>

        {listbox.open ? (
          <ListboxPanel
            id={listId}
            labelledBy={labelId}
            optionId={optionId}
            listbox={listbox}
            multiple
            emptyMessage={emptyMessage}
            items={options.map((option) => ({
              key: option,
              label: option,
              selected: value.includes(option),
            }))}
          />
        ) : null}
      </div>

      {value.length > 0 ? (
        <ul className="niche-tags multiselect__tags">
          {value.map((item) => (
            <li key={item} className="tag">
              <span>{item}</span>
              <button
                type="button"
                className="tag__remove"
                aria-label={`Bỏ ${item}`}
                disabled={disabled}
                onClick={() => onChange(value.filter((entry) => entry !== item))}
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
};
