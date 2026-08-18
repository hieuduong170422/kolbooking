import type { ReactNode } from 'react';
import { cx } from '../../utils/cx';
import { Popover } from './popover';

export interface DropdownItem {
  readonly key: string;
  readonly label: ReactNode;
  readonly onSelect: () => void;
  readonly tone?: 'default' | 'danger';
  readonly disabled?: boolean;
}

export interface DropdownProps {
  readonly trigger: ReactNode;
  readonly triggerClassName?: string;
  readonly triggerLabel?: string;
  readonly triggerTitle?: string;
  readonly items: readonly DropdownItem[];
  readonly panelClassName?: string;
  readonly className?: string;
}

/** Menu hành động: nút mở + danh sách mục, chọn xong tự đóng. */
export const Dropdown = ({
  trigger,
  triggerClassName,
  triggerLabel,
  triggerTitle,
  items,
  panelClassName,
  className,
}: DropdownProps) => (
  <Popover
    trigger={trigger}
    triggerClassName={triggerClassName}
    triggerLabel={triggerLabel}
    triggerTitle={triggerTitle}
    role="menu"
    panelClassName={cx('dropdown-menu', panelClassName)}
    className={className}
  >
    {(close) =>
      items.map((item) => (
        <button
          key={item.key}
          type="button"
          role="menuitem"
          disabled={item.disabled}
          className={cx('dropdown-menu__item', item.tone === 'danger' && 'dropdown-menu__item--danger')}
          onClick={() => {
            close();
            item.onSelect();
          }}
        >
          {item.label}
        </button>
      ))
    }
  </Popover>
);
