import { useId, type ReactNode } from 'react';
import { cx } from '../../utils/cx';
import { Field, type FieldShellProps } from './field';
import { fieldLabelId } from './field-ids';
import { ListboxPanel } from './listbox-panel';
import { useListbox } from './use-listbox';

export interface SelectOption {
  readonly value: string;
  readonly label: ReactNode;
  readonly disabled?: boolean;
}

export interface SelectProps extends FieldShellProps {
  readonly options: readonly SelectOption[];
  /** Mục trống đứng đầu, value là chuỗi rỗng — dùng cho bộ lọc "Tất cả". */
  readonly placeholder?: string;
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly disabled?: boolean;
  readonly id?: string;
  readonly className?: string;
  readonly 'aria-label'?: string;
  readonly emptyMessage?: string;
}

/**
 * Dropdown list chọn-một, tự vẽ danh sách thay vì dùng `<select>` gốc.
 *
 * Lý do không dùng select gốc: danh sách bung ra do hệ điều hành vẽ nên mỗi máy
 * một kiểu và không theo được hệ màu của app. Đổi lại phải tự lo bàn phím và
 * ARIA — phần đó nằm trong `useListbox` để Select và MultiSelect dùng chung.
 */
export const Select = ({
  label,
  hint,
  error,
  counter,
  span,
  fieldClassName,
  options,
  placeholder,
  value,
  onChange,
  disabled,
  id,
  className,
  emptyMessage = 'Không có lựa chọn nào.',
  'aria-label': ariaLabel,
}: SelectProps) => {
  const baseId = useId();
  const listId = `${baseId}-list`;
  const optionId = (index: number): string => `${baseId}-opt-${index}`;

  const items =
    placeholder === undefined
      ? options
      : [{ value: '', label: placeholder } as SelectOption, ...options];
  const selectedIndex = items.findIndex((item) => item.value === value);

  const listbox = useListbox({
    optionCount: items.length,
    closeOnPick: true,
    initialIndex: () => (selectedIndex === -1 ? 0 : selectedIndex),
    onPick: (index) => {
      const picked = items[index];
      if (picked !== undefined) onChange(picked.value);
    },
  });

  const selectedLabel = selectedIndex === -1 ? placeholder : items[selectedIndex]?.label;

  return (
    <Field
      label={label}
      hint={hint}
      error={error}
      counter={counter}
      span={span}
      fieldClassName={fieldClassName}
      controlId={id}
    >
      {(aria) => (
        <div className="listbox" ref={listbox.containerRef}>
          <button
            {...aria}
            type="button"
            role="combobox"
            className={cx(
              'select',
              'listbox__trigger',
              value === '' && 'listbox__trigger--empty',
              aria['aria-invalid'] === true && 'select--error',
              className,
            )}
            aria-label={ariaLabel}
            aria-expanded={listbox.open}
            aria-controls={listId}
            aria-haspopup="listbox"
            aria-activedescendant={listbox.open ? optionId(listbox.activeIndex) : undefined}
            disabled={disabled}
            onClick={listbox.toggleOpen}
            onKeyDown={listbox.handleKeyDown}
          >
            {selectedLabel}
          </button>

          {listbox.open ? (
            <ListboxPanel
              id={listId}
              labelledBy={label === undefined ? aria.id : fieldLabelId(aria.id)}
              optionId={optionId}
              listbox={listbox}
              emptyMessage={emptyMessage}
              items={items.map((item, index) => ({
                key: item.value,
                label: item.label,
                selected: index === selectedIndex,
                disabled: item.disabled,
              }))}
            />
          ) : null}
        </div>
      )}
    </Field>
  );
};
