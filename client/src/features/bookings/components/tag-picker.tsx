import { useId, useState, type KeyboardEvent } from 'react';
import { IconPlus } from '../../../shared/components/icons';
import { Button, Input, MultiSelect } from '../../../shared/components/ui';

interface TagPickerProps {
  readonly label: string;
  readonly description: string;
  /** Gợi ý chọn nhanh; mục đã chọn nhưng không nằm trong đây vẫn hiện. */
  readonly presets: readonly string[];
  readonly selected: readonly string[];
  readonly onChange: (next: readonly string[]) => void;
  readonly addPlaceholder: string;
}

/**
 * Chọn nhiều mục cho brief: danh sách đầy đủ nằm gọn trong một dropdown, mục đã
 * chọn hiện thành thẻ có dấu × ngay dưới, kèm đường thoát tự nhập.
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

  // Mục tự nhập (hoặc do mẫu điền vào) không nằm trong presets vẫn phải có mặt
  // trong dropdown, nếu không bỏ chọn xong là mất luôn khỏi danh sách.
  const options = [...presets, ...selected.filter((item) => !presets.includes(item))];

  return (
    <div className="tag-picker field--full">
      <MultiSelect
        label={label}
        hint={description}
        options={options}
        value={selected}
        onChange={onChange}
        placeholder={`Chọn ${label.toLowerCase()}...`}
      />

      <div className="link-row">
        <Input
          id={inputId}
          value={draft}
          placeholder={addPlaceholder}
          aria-label={`Thêm mục cho ${label.toLowerCase()}`}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={handleKeyDown}
        />
        <Button icon={<IconPlus />} disabled={draft.trim().length === 0} onClick={addDraft}>
          Thêm
        </Button>
      </div>
    </div>
  );
};
