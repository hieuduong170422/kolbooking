import { IconCheck } from '../../../shared/components/icons';

export interface ChecklistItem {
  readonly label: string;
  readonly done: boolean;
  /** Gợi ý hiện khi mục chưa đạt — nói rõ cần làm gì, không chỉ báo thiếu. */
  readonly hint: string;
}

/**
 * Bảng tiến độ hồ sơ (CRE-001, CRE-007) — cho creator biết chính xác còn
 * thiếu gì để gửi duyệt, thay vì bấm rồi mới nhận lỗi từ server.
 */
export const ProfileChecklist = ({ items }: { items: readonly ChecklistItem[] }) => {
  const doneCount = items.filter((item) => item.done).length;
  const percent = Math.round((doneCount / items.length) * 100);

  return (
    <div className="checklist">
      <div className="checklist__head">
        <span className="checklist__count">
          {doneCount}/{items.length}
        </span>
        <span className="checklist__label">mục bắt buộc đã xong</span>
      </div>
      <div
        className="checklist__bar"
        role="progressbar"
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Tiến độ hoàn thiện hồ sơ"
      >
        <span className="checklist__bar-fill" style={{ width: `${percent}%` }} />
      </div>
      <ul className="checklist__items">
        {items.map((item) => (
          <li
            key={item.label}
            className={`checklist__item${item.done ? ' checklist__item--done' : ''}`}
          >
            <span className="checklist__mark" aria-hidden="true">
              {item.done ? <IconCheck /> : null}
            </span>
            <span className="checklist__text">
              {item.label}
              {item.done ? null : <em className="checklist__hint">{item.hint}</em>}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
};
