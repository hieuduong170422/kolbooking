import { forwardRef, type InputHTMLAttributes, type ReactNode } from 'react';
import { cx } from '../../utils/cx';

export interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  readonly label: ReactNode;
  /** `option` nằm trong hàng chọn nhiều; `field` là ô đứng riêng (điều khoản...). */
  readonly variant?: 'option' | 'field';
}

/** Ô tích — nhãn bọc input nên bấm vào chữ cũng đổi trạng thái. */
export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ label, variant = 'option', className, ...rest }, ref) => (
    <label className={cx(variant === 'field' ? 'checkbox-field' : 'checkbox-option', className)}>
      <input {...rest} ref={ref} type="checkbox" />
      <span>{label}</span>
    </label>
  ),
);

Checkbox.displayName = 'Checkbox';
