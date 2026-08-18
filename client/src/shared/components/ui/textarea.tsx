import { forwardRef, type TextareaHTMLAttributes } from 'react';
import { cx } from '../../utils/cx';
import { Field, type FieldShellProps } from './field';

export interface TextareaProps
  extends TextareaHTMLAttributes<HTMLTextAreaElement>,
    FieldShellProps {
  /** Hiện bộ đếm `đã dùng/tối đa` cạnh nhãn — cần có `maxLength` và `value`. */
  readonly showCounter?: boolean;
}

/** Ô nhập nhiều dòng, cao tối thiểu 96px và chỉ kéo giãn theo chiều dọc. */
export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  (
    {
      label,
      hint,
      error,
      counter,
      span,
      fieldClassName,
      showCounter,
      className,
      id,
      maxLength,
      value,
      ...rest
    },
    ref,
  ) => {
    const length = typeof value === 'string' ? value.length : undefined;
    const autoCounter =
      showCounter === true && maxLength !== undefined && length !== undefined
        ? `${length}/${maxLength}`
        : undefined;

    return (
      <Field
        label={label}
        hint={hint}
        error={error}
        counter={counter ?? autoCounter}
        span={span}
        fieldClassName={fieldClassName}
        controlId={id}
      >
        {(aria) => (
          <textarea
            {...aria}
            {...rest}
            ref={ref}
            value={value}
            maxLength={maxLength}
            className={cx(
              'textarea',
              aria['aria-invalid'] === true && 'textarea--error',
              className,
            )}
          />
        )}
      </Field>
    );
  },
);

Textarea.displayName = 'Textarea';
