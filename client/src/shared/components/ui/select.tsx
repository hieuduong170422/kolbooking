import { forwardRef, type ReactNode, type SelectHTMLAttributes } from 'react';
import { cx } from '../../utils/cx';
import { Field, type FieldShellProps } from './field';

export interface SelectOption {
  readonly value: string;
  readonly label: ReactNode;
  readonly disabled?: boolean;
}

export interface SelectProps
  extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'size'>,
    FieldShellProps {
  /** Danh sách lựa chọn. Bỏ trống khi truyền `<option>` qua children. */
  readonly options?: readonly SelectOption[];
  /** Mục trống đứng đầu, value là chuỗi rỗng — dùng cho bộ lọc "Tất cả". */
  readonly placeholder?: string;
}

/**
 * Dropdown list dựng trên `<select>` gốc: giữ được bàn phím, trình đọc màn hình
 * và picker của điện thoại, chỉ thay mũi tên mặc định bằng caret của hệ màu.
 */
export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  (
    {
      label,
      hint,
      error,
      counter,
      span,
      fieldClassName,
      options,
      placeholder,
      className,
      children,
      id,
      ...rest
    },
    ref,
  ) => (
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
        <select
          {...aria}
          {...rest}
          ref={ref}
          className={cx('select', aria['aria-invalid'] === true && 'select--error', className)}
        >
          {placeholder !== undefined ? <option value="">{placeholder}</option> : null}
          {options?.map((option) => (
            <option key={option.value} value={option.value} disabled={option.disabled}>
              {option.label}
            </option>
          ))}
          {children}
        </select>
      )}
    </Field>
  ),
);

Select.displayName = 'Select';
