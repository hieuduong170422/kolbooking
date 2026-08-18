import { useEffect, useId, useRef, type ReactNode } from 'react';
import { cx } from '../../utils/cx';

export interface ModalProps {
  readonly title: ReactNode;
  /** Câu dẫn ngắn dưới tiêu đề. */
  readonly description?: ReactNode;
  readonly onClose: () => void;
  /** Nút hành động ở đáy — xếp về bên phải. */
  readonly footer?: ReactNode;
  /** Class thêm cho thẻ nội dung, vd `creator-modal__card` để nới bề ngang. */
  readonly cardClassName?: string;
  readonly children?: ReactNode;
}

/**
 * Hộp thoại chắn nền. Escape đóng, và tiêu điểm nhảy vào thẻ nội dung khi mở
 * để người dùng bàn phím không bị bỏ lại phía sau lớp phủ.
 */
export const Modal = ({
  title,
  description,
  onClose,
  footer,
  cardClassName,
  children,
}: ModalProps) => {
  const titleId = useId();
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    cardRef.current?.focus();
    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div className="modal" role="dialog" aria-modal="true" aria-labelledby={titleId}>
      <div className={cx('modal__card', cardClassName)} ref={cardRef} tabIndex={-1}>
        <div className="modal__header">
          <h2 id={titleId}>{title}</h2>
          <button type="button" className="modal__close" aria-label="Đóng" onClick={onClose}>
            ×
          </button>
        </div>
        {description !== undefined ? <p className="page__subtitle">{description}</p> : null}
        {children}
        {footer !== undefined ? <div className="modal__actions">{footer}</div> : null}
      </div>
    </div>
  );
};
