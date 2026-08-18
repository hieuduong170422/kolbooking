import { useEffect, type RefObject } from 'react';

/**
 * Đóng lớp nổi khi bấm ra ngoài hoặc nhấn Escape.
 *
 * Dùng `mousedown` chứ không phải `click`: nếu chờ tới `click` thì phần tử bên
 * dưới con trỏ có thể đã bị unmount, khiến lần bấm đầu tiên ra ngoài bị nuốt.
 */
export const useDismiss = (
  open: boolean,
  containerRef: RefObject<HTMLElement | null>,
  onDismiss: () => void,
): void => {
  useEffect(() => {
    if (!open) return;

    const handleMouseDown = (event: MouseEvent): void => {
      const container = containerRef.current;
      if (container && !container.contains(event.target as Node)) onDismiss();
    };
    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') onDismiss();
    };

    document.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open, containerRef, onDismiss]);
};
