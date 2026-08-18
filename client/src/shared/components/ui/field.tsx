import { useId, type ReactNode } from 'react';
import { cx } from '../../utils/cx';
import { fieldLabelId } from './field-ids';

/** Bề ngang của trường trong `.field-grid` 12 cột. */
export type FieldSpan = 'half' | 'full';

/**
 * Props khung trường — Input/Select/Textarea đều nhận, nên nhãn, gợi ý và lỗi
 * hiển thị giống hệt nhau ở mọi form.
 */
export interface FieldShellProps {
  /** Nhãn hiển thị. Bỏ trống khi trường đã có `aria-label` riêng. */
  readonly label?: ReactNode;
  /** Gợi ý một dòng dưới ô nhập. */
  readonly hint?: ReactNode;
  /** Lỗi inline — hiện màu đỏ và bật `aria-invalid` cho control. */
  readonly error?: ReactNode;
  /** Chữ nhỏ nằm bên phải nhãn, thường là bộ đếm ký tự. */
  readonly counter?: ReactNode;
  readonly span?: FieldSpan;
  /** Class cho khung bọc (không phải cho control bên trong). */
  readonly fieldClassName?: string;
}

/** Thuộc tính a11y mà khung trường truyền xuống control. */
export interface FieldAria {
  readonly id: string;
  readonly 'aria-describedby': string | undefined;
  readonly 'aria-invalid': true | undefined;
}


interface FieldProps extends FieldShellProps {
  /** Id do người dùng chỉ định; mặc định sinh tự động bằng `useId`. */
  readonly controlId?: string;
  readonly children: (aria: FieldAria) => ReactNode;
}

/** Node rỗng (undefined/null/false/chuỗi rỗng) coi như không có. */
const isFilled = (node: ReactNode): boolean =>
  node !== undefined && node !== null && node !== false && node !== '';

/**
 * Khung chung cho một trường nhập: nhãn ↔ control ↔ gợi ý ↔ lỗi.
 *
 * Nhãn nối với control bằng `htmlFor`/`id` chứ không bọc lồng nhau, và <label>
 * chỉ chứa đúng chữ nhãn. Nhờ vậy gợi ý, lỗi hay bộ đếm ký tự không lọt vào
 * tên khả truy cập (accessible name) của control.
 */
export const Field = ({
  label,
  hint,
  error,
  counter,
  span,
  fieldClassName,
  controlId,
  children,
}: FieldProps) => {
  const generatedId = useId();
  const id = controlId ?? generatedId;

  const hasHint = isFilled(hint);
  const hasError = isFilled(error);
  const hintId = hasHint ? `${id}-hint` : undefined;
  const errorId = hasError ? `${id}-error` : undefined;

  const aria: FieldAria = {
    id,
    'aria-describedby': cx(errorId, hintId),
    'aria-invalid': hasError ? true : undefined,
  };

  const hasShell = isFilled(label) || hasHint || hasError || isFilled(counter) || span !== undefined || fieldClassName !== undefined;
  if (!hasShell) return <>{children(aria)}</>;

  return (
    <div className={cx('form-field', span && `field--${span}`, fieldClassName)}>
      {isFilled(label) || isFilled(counter) ? (
        <div className={cx('form-field__title', !isFilled(label) && 'form-field__title--bare')}>
          {isFilled(label) ? (
            <label id={fieldLabelId(id)} htmlFor={id}>
              {label}
            </label>
          ) : null}
          {isFilled(counter) ? <span className="onb-counter">{counter}</span> : null}
        </div>
      ) : null}
      {children(aria)}
      {hasHint ? <small id={hintId}>{hint}</small> : null}
      {hasError ? (
        <p className="field-note field-note--error" id={errorId}>
          {error}
        </p>
      ) : null}
    </div>
  );
};
