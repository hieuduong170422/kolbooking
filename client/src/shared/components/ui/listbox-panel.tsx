import type { ReactNode } from 'react';
import { cx } from '../../utils/cx';
import type { Listbox } from './use-listbox';

export interface ListboxItem {
  readonly key: string;
  readonly label: ReactNode;
  readonly selected: boolean;
  readonly disabled?: boolean;
}

interface ListboxPanelProps {
  readonly id: string;
  readonly labelledBy: string;
  readonly optionId: (index: number) => string;
  readonly items: readonly ListboxItem[];
  readonly listbox: Listbox;
  readonly multiple?: boolean;
  readonly emptyMessage: string;
}

/** Lớp nổi chứa danh sách mục — dùng chung cho Select và MultiSelect. */
export const ListboxPanel = ({
  id,
  labelledBy,
  optionId,
  items,
  listbox,
  multiple,
  emptyMessage,
}: ListboxPanelProps) => (
  <ul
    className={cx('listbox__panel', `listbox__panel--${listbox.placement}`)}
    id={id}
    role="listbox"
    aria-multiselectable={multiple === true ? true : undefined}
    aria-labelledby={labelledBy}
    ref={listbox.listRef}
  >
    {items.length === 0 ? (
      <li className="listbox__empty">{emptyMessage}</li>
    ) : (
      items.map((item, index) => (
        <li
          key={item.key}
          id={optionId(index)}
          role="option"
          aria-selected={item.selected}
          aria-disabled={item.disabled === true ? true : undefined}
          className={cx(
            'listbox__option',
            index === listbox.activeIndex && 'listbox__option--active',
            item.disabled === true && 'listbox__option--disabled',
          )}
          // Giữ tiêu điểm ở nút mở: mất tiêu điểm là aria-activedescendant trỏ
          // vào hư không và trình đọc màn hình im lặng.
          onMouseDown={(event) => event.preventDefault()}
          onMouseEnter={() => listbox.setActiveIndex(index)}
          onClick={() => {
            if (item.disabled !== true) listbox.pick(index);
          }}
        >
          <span className="listbox__check" aria-hidden="true">
            {item.selected ? '✓' : ''}
          </span>
          {item.label}
        </li>
      ))
    )}
  </ul>
);
