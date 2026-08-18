import { Link, type LinkProps } from 'react-router';
import { cx } from '../../utils/cx';
import type { ButtonVariant } from './button';

export interface LinkButtonProps extends LinkProps {
  readonly variant?: ButtonVariant;
  readonly size?: 'sm' | 'md';
  readonly block?: boolean;
}

/**
 * Điều hướng nhưng trông như nút. Vẫn là `<a>` nên mở tab mới, copy link và
 * trình đọc màn hình đều hoạt động đúng — khác hẳn `<button onClick=navigate>`.
 */
export const LinkButton = ({
  variant = 'primary',
  size = 'md',
  block,
  className,
  ...rest
}: LinkButtonProps) => (
  <Link
    {...rest}
    className={
      variant === 'link'
        ? cx('button-link', className)
        : cx(
            'button',
            `button--${variant}`,
            size === 'sm' && 'button--sm',
            block === true && 'button--block',
            className,
          )
    }
  />
);
