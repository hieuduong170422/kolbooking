import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { cx } from '../../utils/cx';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'warning' | 'link';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  readonly variant?: ButtonVariant;
  readonly size?: 'sm' | 'md';
  /** Chiếm trọn bề ngang khối cha. */
  readonly block?: boolean;
  /** Đang chạy: khoá nút và hiện vòng xoay, chữ giữ nguyên để layout không nhảy. */
  readonly loading?: boolean;
  /** Icon đứng trước chữ. */
  readonly icon?: ReactNode;
}

/**
 * Nút bấm dùng chung. Mặc định `type="button"` — nút submit phải khai báo
 * `type="submit"` rõ ràng để không vô tình gửi form.
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'secondary',
      size = 'md',
      block,
      loading,
      icon,
      className,
      children,
      disabled,
      type = 'button',
      ...rest
    },
    ref,
  ) => (
    <button
      {...rest}
      ref={ref}
      type={type}
      disabled={disabled === true || loading === true}
      aria-busy={loading === true ? true : undefined}
      className={
        variant === 'link'
          ? cx('button-link', block === true && 'button--block', className)
          : cx(
              'button',
              `button--${variant}`,
              size === 'sm' && 'button--sm',
              block === true && 'button--block',
              className,
            )
      }
    >
      {loading === true ? <span className="button__spinner" aria-hidden="true" /> : icon}
      {children}
    </button>
  ),
);

Button.displayName = 'Button';
