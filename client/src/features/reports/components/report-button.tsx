import { useContext, useState } from 'react';
import { AuthContext } from '../../auth/store/auth-context';
import { ApiClientError } from '../../../shared/api/api-types';
import { Button, Modal, Select, Textarea } from '../../../shared/components/ui';
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

      {open && sent ? (
        <Modal
          title="Đã gửi báo cáo"
          description="Đội vận hành sẽ xem xét và phản hồi. Cảm ơn bạn đã báo cáo."
          onClose={close}
          footer={
            <Button variant="primary" onClick={close}>
              Đóng
            </Button>
          }
        />
      ) : null}

      {open && !sent ? (
        <Modal
          title={`Báo cáo ${targetName}`}
          description="Mô tả càng cụ thể, đội vận hành xử lý càng nhanh."
          onClose={close}
          footer={
            <>
              <Button variant="ghost" onClick={close}>
                Hủy
              </Button>
              <Button
                variant="danger"
                loading={createReport.isPending}
                disabled={description.trim().length < MIN_DESCRIPTION}
                onClick={submit}
              >
                {createReport.isPending ? 'Đang gửi...' : 'Gửi báo cáo'}
              </Button>
            </>
          }
        >
          {error instanceof ApiClientError ? (
            <div className="notice notice--warning" role="alert">
              <p>{error.message}</p>
            </div>
          ) : null}

          <Select
            label="Lý do"
            options={REPORT_REASONS.map((option) => ({
              value: option,
              label: REPORT_REASON_LABELS[option],
            }))}
            value={reason}
            onChange={(next) => setReason(next as ReportReason)}
          />

          <Textarea
            label="Mô tả chi tiết"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            rows={4}
            minLength={MIN_DESCRIPTION}
            placeholder="Chuyện gì đã xảy ra? Có bằng chứng gì không?"
          />
        </Modal>
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
