import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';
import { cx } from '../../utils/cx';
import type { FieldSpan } from './field';
import { useDismiss } from './use-dismiss';

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
 * Dùng mẫu combobox của ARIA — tiêu điểm ở lại nút mở, mục đang trỏ tới báo qua
 * `aria-activedescendant`. Nhờ vậy bàn phím đi hết danh sách bằng mũi tên thay
 * vì phải Tab qua từng mục.
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

  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const controlRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  useDismiss(open, controlRef, () => setOpen(false));

  // Cuộn mục đang trỏ tới vào tầm nhìn khi đi bằng mũi tên. jsdom không cài
  // scrollIntoView nên phải kiểm tra trước khi gọi, nếu không test sẽ đỏ.
  useEffect(() => {
    if (!open) return;
    const node = listRef.current?.children[activeIndex];
    if (node instanceof HTMLElement && typeof node.scrollIntoView === 'function') {
      node.scrollIntoView({ block: 'nearest' });
    }
  }, [open, activeIndex]);

  const toggle = (option: string): void => {
    onChange(value.includes(option) ? value.filter((item) => item !== option) : [...value, option]);
  };

  const openAt = (index: number): void => {
    setOpen(true);
    setActiveIndex(Math.max(0, Math.min(index, options.length - 1)));
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>): void => {
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        openAt(open ? activeIndex + 1 : 0);
        break;
      case 'ArrowUp':
        event.preventDefault();
        openAt(open ? activeIndex - 1 : options.length - 1);
        break;
      case 'Home':
        if (!open) break;
        event.preventDefault();
        setActiveIndex(0);
        break;
      case 'End':
        if (!open) break;
        event.preventDefault();
        setActiveIndex(options.length - 1);
        break;
      case 'Enter':
      case ' ':
        event.preventDefault();
        if (!open) openAt(0);
        else if (options[activeIndex] !== undefined) toggle(options[activeIndex]);
        break;
      case 'Escape':
        if (!open) break;
        event.preventDefault();
        setOpen(false);
        break;
      default:
        break;
    }
  };

  return (
    <div className={cx('form-field', span && `field--${span}`, 'multiselect', className)}>
      <span className="form-field__label" id={labelId}>
        {label}
      </span>
      {hint !== undefined && hint !== '' ? <p className="onb-hint">{hint}</p> : null}

      <div className="multiselect__control" ref={controlRef}>
        <button
          type="button"
          role="combobox"
          className={cx('select', 'multiselect__trigger', value.length === 0 && 'multiselect__trigger--empty')}
          aria-labelledby={labelId}
          aria-expanded={open}
          aria-controls={listId}
          aria-haspopup="listbox"
          aria-activedescendant={open ? optionId(activeIndex) : undefined}
          disabled={disabled}
          onClick={() => (open ? setOpen(false) : openAt(0))}
          onKeyDown={handleKeyDown}
        >
          {value.length === 0 ? placeholder : summarize(value.length)}
        </button>

        {open ? (
          <ul
            className="multiselect__panel"
            id={listId}
            role="listbox"
            aria-multiselectable="true"
            aria-labelledby={labelId}
            ref={listRef}
          >
            {options.length === 0 ? (
              <li className="multiselect__empty">{emptyMessage}</li>
            ) : (
              options.map((option, index) => (
                <li
                  key={option}
                  id={optionId(index)}
                  role="option"
                  aria-selected={value.includes(option)}
                  className={cx(
                    'multiselect__option',
                    index === activeIndex && 'multiselect__option--active',
                  )}
                  // Giữ tiêu điểm ở nút mở: mất tiêu điểm là aria-activedescendant
                  // trỏ vào hư không và trình đọc màn hình im lặng.
                  onMouseDown={(event) => event.preventDefault()}
                  onMouseEnter={() => setActiveIndex(index)}
                  onClick={() => toggle(option)}
                >
                  <span className="multiselect__check" aria-hidden="true">
                    {value.includes(option) ? '✓' : ''}
                  </span>
                  {option}
                </li>
              ))
            )}
          </ul>
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
