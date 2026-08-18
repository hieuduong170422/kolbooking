import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { cx } from '../../utils/cx';

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Bắt buộc: nút chỉ có icon nên cần tên khả truy cập. */
  readonly label: string;
  readonly icon: ReactNode;
  readonly tone?: 'default' | 'danger';
}

/** Nút vuông chỉ chứa icon — xoá dòng, đóng modal, hành động phụ trong list. */
export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ label, icon, tone = 'default', className, type = 'button', ...rest }, ref) => (
    <button
      {...rest}
      ref={ref}
      type={type}
      aria-label={label}
      title={rest.title ?? label}
      className={cx('icon-button', tone === 'danger' && 'icon-button--danger', className)}
    >
      {icon}
    </button>
  ),
);

IconButton.displayName = 'IconButton';
