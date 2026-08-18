import { useRef, type ChangeEvent, type ReactNode } from 'react';
import { cx } from '../../utils/cx';
import type { ButtonVariant } from './button';

export interface FileButtonProps {
  readonly label: ReactNode;
  readonly accept?: string;
  readonly onSelect: (file: File) => void;
  readonly disabled?: boolean;
  readonly variant?: ButtonVariant;
  readonly icon?: ReactNode;
  readonly className?: string;
  /** Kiểu ô thả file cỡ lớn thay cho nút nhỏ. */
  readonly dropzone?: boolean;
  /** Dòng phụ, chỉ dùng khi `dropzone`. */
  readonly hint?: ReactNode;
}

/**
 * Nút chọn file. Bọc `<input type="file">` bằng `<label>` thay vì gọi
 * `ref.click()`: cách này không cần JS để mở hộp thoại chọn file và bàn phím
 * vẫn kích hoạt được như một nút thật.
 *
 * Ô nhập được reset sau mỗi lần chọn để chọn lại cùng một file vẫn bắn `change`.
 */
export const FileButton = ({
  label,
  accept,
  onSelect,
  disabled,
  variant = 'secondary',
  icon,
  className,
  dropzone,
  hint,
}: FileButtonProps) => {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleChange = (event: ChangeEvent<HTMLInputElement>): void => {
    const file = event.target.files?.[0];
    if (file) onSelect(file);
    if (inputRef.current) inputRef.current.value = '';
  };

  return (
    <label
      className={
        dropzone === true
          ? cx('dropzone', className)
          : cx('button', `button--${variant}`, 'avatar-upload', className)
      }
      aria-disabled={disabled === true ? true : undefined}
    >
      {icon}
      {dropzone === true ? <span className="dropzone__title">{label}</span> : label}
      {dropzone === true && hint !== undefined ? (
        <span className="dropzone__hint">{hint}</span>
      ) : null}
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="file-input"
        onChange={handleChange}
        disabled={disabled}
      />
    </label>
  );
};
