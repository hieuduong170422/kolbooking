import { useContext, useState } from 'react';
import { AuthContext } from '../../auth/store/auth-context';
import { ApiClientError } from '../../../shared/api/api-types';
import { useCreateReport } from '../hooks/use-reports';
import {
  REPORT_REASONS,
  REPORT_REASON_LABELS,
  type ReportReason,
  type ReportTargetType,
} from '../types/report-types';

interface ReportButtonProps {
  readonly targetType: ReportTargetType;
  readonly targetId: string;
  /** Tên hiển thị của đối tượng — nhắc lại trong modal để bấm nhầm là thấy ngay. */
  readonly targetName: string;
}

const MIN_DESCRIPTION = 10;

/** Phần có state + mutation — chỉ mount khi chắc chắn đã đăng nhập. */
const ReportControl = ({ targetType, targetId, targetName }: ReportButtonProps) => {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<ReportReason>('inappropriate_content');
  const [description, setDescription] = useState('');
  const [sent, setSent] = useState(false);
  const createReport = useCreateReport();

  const close = (): void => {
    setOpen(false);
    setSent(false);
    setDescription('');
    createReport.reset();
  };

  const submit = (): void => {
    createReport.mutate(
      { targetType, targetId, reason, description: description.trim() },
      { onSuccess: () => setSent(true) },
    );
  };

  const error = createReport.error;

  return (
    <>
      <button type="button" className="report-link" onClick={() => setOpen(true)}>
        Báo cáo
      </button>

      {open ? (
        <div className="modal" role="dialog" aria-modal="true" aria-labelledby="report-title">
          <div className="modal__card">
            {sent ? (
              <>
                <h2 id="report-title">Đã gửi báo cáo</h2>
                <p className="page__subtitle">
                  Đội vận hành sẽ xem xét và phản hồi. Cảm ơn bạn đã báo cáo.
                </p>
                <div className="form-actions">
                  <button type="button" className="button button--primary" onClick={close}>
                    Đóng
                  </button>
                </div>
              </>
            ) : (
              <>
                <h2 id="report-title">Báo cáo {targetName}</h2>
                <p className="page__subtitle">
                  Mô tả càng cụ thể, đội vận hành xử lý càng nhanh.
                </p>

                {error instanceof ApiClientError ? (
                  <div className="notice notice--warning" role="alert">
                    <p>{error.message}</p>
                  </div>
                ) : null}

                <label className="form-field">
                  <span>Lý do</span>
                  <select
                    className="select"
                    value={reason}
                    onChange={(event) => setReason(event.target.value as ReportReason)}
                  >
                    {REPORT_REASONS.map((option) => (
                      <option key={option} value={option}>
                        {REPORT_REASON_LABELS[option]}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="form-field">
                  <span>Mô tả chi tiết</span>
                  <textarea
                    className="textarea"
                    value={description}
                    onChange={(event) => setDescription(event.target.value)}
                    rows={4}
                    minLength={MIN_DESCRIPTION}
                    placeholder="Chuyện gì đã xảy ra? Có bằng chứng gì không?"
                  />
                </label>

                <div className="form-actions">
                  <button
                    type="button"
                    className="button button--danger"
                    disabled={
                      description.trim().length < MIN_DESCRIPTION || createReport.isPending
                    }
                    onClick={submit}
                  >
                    {createReport.isPending ? 'Đang gửi...' : 'Gửi báo cáo'}
                  </button>
                  <button type="button" className="button button--ghost" onClick={close}>
                    Hủy
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      ) : null}
    </>
  );
};

/**
 * Nút báo cáo vi phạm trên trang công khai (SRCH-007).
 * Yêu cầu đăng nhập để chống spam. Đọc context trực tiếp và tách phần điều
 * khiển ra component con: hook mutation không được chạy khi chưa có provider.
 */
export const ReportButton = (props: ReportButtonProps) => {
  const auth = useContext(AuthContext);
  if (!auth?.user) return null;
  return <ReportControl {...props} />;
};
