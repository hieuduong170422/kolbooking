import { useEffect, useRef, useState, type KeyboardEvent, type RefObject } from 'react';
import { useDismiss } from './use-dismiss';

interface UseListboxArgs {
  readonly optionCount: number;
  /** Gọi khi người dùng chốt mục ở vị trí `index` (bấm chuột hoặc Enter). */
  readonly onPick: (index: number) => void;
  /** Chọn xong thì đóng — đúng cho chọn-một, sai cho chọn-nhiều. */
  readonly closeOnPick: boolean;
  /** Vị trí trỏ tới khi vừa mở; mặc định là mục đầu. */
  readonly initialIndex?: () => number;
}

/** Lớp nổi bung xuống dưới, hoặc lên trên khi dưới không đủ chỗ. */
export type ListboxPlacement = 'below' | 'above';

export interface Listbox {
  readonly open: boolean;
  readonly placement: ListboxPlacement;
  readonly activeIndex: number;
  readonly containerRef: RefObject<HTMLDivElement | null>;
  readonly listRef: RefObject<HTMLUListElement | null>;
  readonly setActiveIndex: (index: number) => void;
  readonly toggleOpen: () => void;
  readonly close: () => void;
  readonly pick: (index: number) => void;
  readonly handleKeyDown: (event: KeyboardEvent<HTMLButtonElement>) => void;
}

/** Chiều cao tối đa của lớp nổi, phải khớp max-height của .listbox__panel. */
const PANEL_MAX_HEIGHT = 264;
const PANEL_GAP = 6;

/**
 * Bung xuống dưới nếu còn chỗ; hết chỗ dưới mà trên rộng hơn thì bung lên.
 * Không có phép đo (jsdom, lần render đầu) thì cứ bung xuống như mặc định.
 */
const choosePlacement = (container: HTMLElement | null): ListboxPlacement => {
  if (container === null || typeof container.getBoundingClientRect !== 'function') return 'below';
  const rect = container.getBoundingClientRect();
  if (rect.height === 0) return 'below';
  const room = PANEL_MAX_HEIGHT + PANEL_GAP;
  const below = window.innerHeight - rect.bottom;
  return below < room && rect.top > below ? 'above' : 'below';
};

/**
 * Phần hành vi dùng chung của mọi dropdown dạng danh sách: mở/đóng, mục đang
 * trỏ tới, điều hướng bàn phím.
 *
 * Theo mẫu combobox của ARIA — tiêu điểm ở lại nút mở, mục đang trỏ tới báo qua
 * `aria-activedescendant`. Nhờ vậy mũi tên đi hết danh sách thay vì phải Tab
 * qua từng mục.
 */
export const useListbox = ({
  optionCount,
  onPick,
  closeOnPick,
  initialIndex,
}: UseListboxArgs): Listbox => {
  const [open, setOpen] = useState(false);
  const [placement, setPlacement] = useState<ListboxPlacement>('below');
  const [activeIndex, setActiveIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const close = (): void => setOpen(false);
  useDismiss(open, containerRef, close);

  // Cuộn mục đang trỏ tới vào tầm nhìn khi đi bằng mũi tên. jsdom không cài
  // scrollIntoView nên phải kiểm tra trước khi gọi, nếu không test sẽ đỏ.
  useEffect(() => {
    if (!open) return;
    const node = listRef.current?.children[activeIndex];
    if (node instanceof HTMLElement && typeof node.scrollIntoView === 'function') {
      node.scrollIntoView({ block: 'nearest' });
    }
  }, [open, activeIndex]);

  const clamp = (index: number): number => Math.max(0, Math.min(index, optionCount - 1));

  const openAt = (index: number): void => {
    setPlacement(choosePlacement(containerRef.current));
    setOpen(true);
    setActiveIndex(clamp(index));
  };

  const pick = (index: number): void => {
    onPick(index);
    if (closeOnPick) close();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>): void => {
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        openAt(open ? activeIndex + 1 : (initialIndex?.() ?? 0));
        break;
      case 'ArrowUp':
        event.preventDefault();
        openAt(open ? activeIndex - 1 : (initialIndex?.() ?? optionCount - 1));
        break;
      case 'Home':
        if (!open) break;
        event.preventDefault();
        setActiveIndex(0);
        break;
      case 'End':
        if (!open) break;
        event.preventDefault();
        setActiveIndex(optionCount - 1);
        break;
      case 'Enter':
      case ' ':
        event.preventDefault();
        if (!open) openAt(initialIndex?.() ?? 0);
        else if (activeIndex < optionCount) pick(activeIndex);
        break;
      case 'Escape':
        if (!open) break;
        event.preventDefault();
        close();
        break;
      default:
        break;
    }
  };

  return {
    open,
    placement,
    activeIndex,
    containerRef,
    listRef,
    setActiveIndex: (index) => setActiveIndex(clamp(index)),
    toggleOpen: () => (open ? close() : openAt(initialIndex?.() ?? 0)),
    close,
    pick,
    handleKeyDown,
  };
};
