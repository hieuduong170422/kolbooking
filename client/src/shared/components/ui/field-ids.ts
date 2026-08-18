/**
 * Quy ước id trong một trường nhập. Tách khỏi field.tsx để file đó chỉ export
 * component — Fast Refresh của Vite cần vậy.
 */

/** Id của thẻ <label>, để lớp nổi trỏ `aria-labelledby` về đúng nhãn của trường. */
export const fieldLabelId = (controlId: string): string => `${controlId}-label`;
