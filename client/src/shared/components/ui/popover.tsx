import { useCallback, useRef, useState, type ReactNode } from 'react';
import { cx } from '../../utils/cx';
import { useDismiss } from './use-dismiss';

export interface PopoverProps {
  /** Nội dung nút mở. */
  readonly trigger: ReactNode;
  readonly triggerClassName?: string;
  readonly triggerLabel?: string;
  readonly triggerTitle?: string;
  /** `menu` cho danh sách hành động, `dialog` cho bảng nội dung tự do. */
  readonly role?: 'menu' | 'dialog';
  readonly panelClassName?: string;
  readonly className?: string;
  /** Nhận hàm đóng để mục bên trong tự tắt lớp nổi sau khi chạy xong. */
  readonly children: (close: () => void) => ReactNode;
}

/**
 * Lớp nổi neo vào một nút: menu tài khoản, bảng thông báo, menu hành động.
 * Gom sẵn phần đóng-khi-bấm-ra-ngoài và Escape để mọi chỗ hành xử như nhau.
 */
export const Popover = ({
  trigger,
  triggerClassName,
  triggerLabel,
  triggerTitle,
  role = 'menu',
  panelClassName,
  className,
  children,
}: PopoverProps) => {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const close = useCallback(() => setOpen(false), []);
  useDismiss(open, containerRef, close);

  return (
    <div className={cx('popover', className)} ref={containerRef}>
      <button
        type="button"
        className={triggerClassName}
        aria-haspopup={role === 'menu' ? 'menu' : 'dialog'}
        aria-expanded={open}
        aria-label={triggerLabel}
        title={triggerTitle}
        onClick={() => setOpen((current) => !current)}
      >
        {trigger}
      </button>
      {open ? (
        <div className={cx('popover__panel', panelClassName)} role={role}>
          {children(close)}
        </div>
      ) : null}
    </div>
  );
};
