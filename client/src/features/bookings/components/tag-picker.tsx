import { useId, useState, type KeyboardEvent } from 'react';

interface TagPickerProps {
  readonly label: string;
  readonly description: string;
  /** Gợi ý bấm chọn nhanh; mục đã chọn nhưng không nằm trong đây vẫn hiện. */
  readonly presets: readonly string[];
  readonly selected: readonly string[];
  readonly onChange: (next: readonly string[]) => void;
  readonly addPlaceholder: string;
}

/**
 * Chọn nhiều mục từ gợi ý, kèm đường thoát tự nhập.
 *
 * Thay cho textarea "mỗi dòng một ý": quy ước đó bắt người dùng nhớ luật định
 * dạng và rất nhiều người sẽ viết bằng dấu phẩy hoặc gạch đầu dòng, để lại một
 * chuỗi rác trong brief mà creator phải đoán.
 */
export const TagPicker = ({
  label,
  description,
  presets,
  selected,
  onChange,
  addPlaceholder,
}: TagPickerProps) => {
  const [draft, setDraft] = useState('');
  const inputId = useId();

  const toggle = (value: string): void => {
    onChange(
      selected.includes(value)
        ? selected.filter((item) => item !== value)
        : [...selected, value],
    );
  };

  const addDraft = (): void => {
    const value = draft.trim();
    // Bỏ qua mục trùng để danh sách gửi đi không có hai dòng giống hệt nhau.
    if (value.length === 0 || selected.includes(value)) {
      setDraft('');
      return;
    }
    onChange([...selected, value]);
    setDraft('');
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>): void => {
    // Enter trong form này sẽ submit cả booking — chặn lại, Enter ở đây nghĩa
    // là "thêm mục".
    if (event.key === 'Enter') {
      event.preventDefault();
      addDraft();
    }
  };

  // Mục tự nhập (hoặc do mẫu điền vào) không nằm trong presets vẫn phải hiện ra.
  const extras = selected.filter((item) => !presets.includes(item));

  return (
    <fieldset className="chip-group field--full">
      <legend className="form-field__label">{label}</legend>
      <p className="onb-hint">{description}</p>

      <div className="chip-group__options">
        {[...presets, ...extras].map((preset) => (
          <label key={preset} className="chip-toggle">
            <input
              type="checkbox"
              checked={selected.includes(preset)}
              onChange={() => toggle(preset)}
            />
            <span>{preset}</span>
          </label>
        ))}
      </div>

      <div className="link-row">
        <input
          id={inputId}
          type="text"
          className="input"
          value={draft}
          placeholder={addPlaceholder}
          aria-label={`Thêm mục cho ${label.toLowerCase()}`}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={handleKeyDown}
        />
        <button
          type="button"
          className="button button--secondary"
          disabled={draft.trim().length === 0}
          onClick={addDraft}
        >
          + Thêm
        </button>
      </div>
    </fieldset>
  );
};
