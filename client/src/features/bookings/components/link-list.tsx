import { useState, type KeyboardEvent } from 'react';

interface LinkListProps {
  readonly links: readonly string[];
  readonly onChange: (next: readonly string[]) => void;
}

/** Chỉ nhận link http/https — server cũng chặn, bắt sớm để khỏi mất một vòng gửi. */
const isValidUrl = (value: string): boolean => {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
};

/**
 * Danh sách link tham khảo — thêm từng cái một thay vì một textarea "mỗi dòng
 * một link". Link sai định dạng bị chặn ngay tại chỗ nhập, kèm lý do.
 */
export const LinkList = ({ links, onChange }: LinkListProps) => {
  const [draft, setDraft] = useState('');
  const [error, setError] = useState<string | null>(null);

  const add = (): void => {
    const value = draft.trim();
    if (value.length === 0) {
      return;
    }
    if (!isValidUrl(value)) {
      setError('Link phải bắt đầu bằng http:// hoặc https://');
      return;
    }
    if (links.includes(value)) {
      setError('Link này đã có trong danh sách.');
      return;
    }
    onChange([...links, value]);
    setDraft('');
    setError(null);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>): void => {
    // Enter ở đây nghĩa là "thêm link", không phải gửi cả yêu cầu booking.
    if (event.key === 'Enter') {
      event.preventDefault();
      add();
    }
  };

  return (
    <fieldset className="chip-group field--full">
      <legend className="form-field__label">Link tham khảo</legend>
      <p className="onb-hint">
        Video hoặc bài đăng bạn muốn creator tham chiếu về phong cách. Không bắt buộc.
      </p>

      {links.length > 0 ? (
        <ul className="doc-list">
          {links.map((link) => (
            <li key={link} className="doc-list__item">
              <span>{link}</span>
              <button
                type="button"
                className="button-link"
                aria-label={`Xoá link ${link}`}
                onClick={() => onChange(links.filter((item) => item !== link))}
              >
                Xoá
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      <div className="link-row">
        <input
          type="url"
          className="input"
          value={draft}
          placeholder="https://..."
          aria-label="Thêm link tham khảo"
          onChange={(event) => {
            setDraft(event.target.value);
            setError(null);
          }}
          onKeyDown={handleKeyDown}
        />
        <button
          type="button"
          className="button button--secondary"
          disabled={draft.trim().length === 0}
          onClick={add}
        >
          + Thêm link
        </button>
      </div>
      {error !== null ? (
        <p className="field-note field-note--error" role="alert">
          {error}
        </p>
      ) : null}
    </fieldset>
  );
};
