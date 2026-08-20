import type { ReactNode } from 'react';

export interface EmptyStateProps {
  readonly title: string;
  readonly description?: ReactNode;
  /**
   * Bước kế tiếp hợp lý cho ĐÚNG màn này. Trang trống mà không có lối đi tiếp
   * thì người dùng phải tự đoán, nên chỗ nào cũng nên có — trừ khi việc cần
   * làm nằm ngoài app (vd creator chờ brand nhắn trước).
   */
  readonly action?: ReactNode;
}

/**
 * Trạng thái rỗng dùng chung. Trước đây mỗi trang tự dựng lại `div.feedback`
 * với cùng bộ class, nên sửa kiểu dáng phải đi sửa từng chỗ và dễ sót.
 */
export const EmptyState = ({ title, description, action }: EmptyStateProps) => (
  <div className="feedback feedback--empty">
    <p className="feedback__title">{title}</p>
    {description === undefined ? null : <p className="feedback__description">{description}</p>}
    {action}
  </div>
);
