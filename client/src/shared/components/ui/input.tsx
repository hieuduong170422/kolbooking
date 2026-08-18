import { forwardRef, type InputHTMLAttributes, type ReactNode } from 'react';
import { cx } from '../../utils/cx';
import { Field, type FieldShellProps } from './field';

export interface InputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'>,
    FieldShellProps {
  /** Ô hẹp cho số lượng/giá đứng cạnh ô mô tả dài. */
  readonly narrow?: boolean;
  /** Nội dung dán trước ô nhập (icon tìm kiếm, ký hiệu tiền...). */
  readonly leading?: ReactNode;
  /** Nội dung dán sau ô nhập (đơn vị, nút phụ...). */
  readonly trailing?: ReactNode;
}

/** Ô nhập một dòng — dùng cho mọi `type` của `<input>` trừ checkbox/radio. */
export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      hint,
      error,
      counter,
      span,
      fieldClassName,
      narrow,
      leading,
      trailing,
      className,
      type = 'text',
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
      {(aria) => {
        const control = (
          <input
            {...aria}
            {...rest}
            ref={ref}
            type={type}
            className={cx(
              'input',
              narrow === true && 'input--narrow',
              aria['aria-invalid'] === true && 'input--error',
              (leading !== undefined || trailing !== undefined) && 'input--affixed',
              className,
            )}
          />
        );

        if (leading === undefined && trailing === undefined) return control;
        return (
          <span className="input-affix">
            {leading !== undefined ? (
              <span className="input-affix__slot" aria-hidden="true">
                {leading}
              </span>
            ) : null}
            {control}
            {trailing !== undefined ? (
              <span className="input-affix__slot input-affix__slot--end" aria-hidden="true">
                {trailing}
              </span>
            ) : null}
          </span>
        );
      }}
    </Field>
  ),
);

Input.displayName = 'Input';
