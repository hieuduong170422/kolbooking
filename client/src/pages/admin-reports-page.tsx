import { useState } from 'react';
import { Link } from 'react-router';
import { useReports, useResolveReport } from '../features/reports/hooks/use-reports';
import {
  REPORT_REASON_LABELS,
  REPORT_STATUSES,
  REPORT_STATUS_LABELS,
  REPORT_TARGET_LABELS,
  type Report,
  type ReportStatus,
} from '../features/reports/types/report-types';
import { ApiClientError } from '../shared/api/api-types';
import { ErrorState } from '../shared/components/feedback/error-state';
import { LoadingState } from '../shared/components/feedback/loading-state';
import { Pagination } from '../shared/components/pagination/pagination';

const PAGE_LIMIT = 20;

/** Số giờ ticket đã chờ — cơ sở để ưu tiên xử lý (DSP-008). */
const hoursWaiting = (createdAt: string): number =>
  Math.max(0, Math.floor((Date.now() - Date.parse(createdAt)) / 3_600_000));

/** Link tới đối tượng bị báo cáo — package nằm trong trang creator nên chỉ link creator. */
const targetLink = (report: Report): string | null =>
  report.targetType === 'creator' ? `/creators/${report.targetId}` : null;

/** Trang /admin/reports — queue xử lý báo cáo vi phạm (SRCH-007, ADM-010). */
export const AdminReportsPage = () => {
  const [status, setStatus] = useState<ReportStatus>('open');
  const [page, setPage] = useState(1);
  const [target, setTarget] = useState<{ report: Report; action: 'resolved' | 'dismissed' } | null>(
    null,
  );
  const [note, setNote] = useState('');
  const [actionError, setActionError] = useState<unknown>(null);

  const { data, isLoading, isError, refetch } = useReports({ status, page, limit: PAGE_LIMIT });
  const resolve = useResolveReport();

  const confirm = (): void => {
    if (target === null) return;
    setActionError(null);
    resolve
      .mutateAsync({ reportId: target.report.id, status: target.action, note: note.trim() })
      .then(() => {
        setTarget(null);
        setNote('');
      })
      .catch((error: unknown) => setActionError(error));
  };

  return (
    <section className="page">
      <div className="page__header">
        <h1>Báo cáo vi phạm</h1>
        <p className="page__subtitle">
          Ticket chờ lâu nhất xếp trước. Mỗi quyết định đều ghi vào nhật ký hoạt động.
        </p>
      </div>

      <div className="review-tabs" role="tablist" aria-label="Lọc theo trạng thái">
        {REPORT_STATUSES.map((item) => (
          <button
            key={item}
            type="button"
            className={`review-tabs__tab${item === status ? ' review-tabs__tab--active' : ''}`}
            onClick={() => {
              setStatus(item);
              setPage(1);
            }}
          >
            {REPORT_STATUS_LABELS[item]}
          </button>
        ))}
      </div>

      {actionError instanceof ApiClientError ? (
        <div className="notice notice--warning" role="alert">
          <p>{actionError.message}</p>
        </div>
      ) : null}

      {isLoading ? <LoadingState message="Đang tải báo cáo..." /> : null}
      {isError || (!isLoading && data === undefined) ? (
        <ErrorState message="Không tải được danh sách báo cáo." onRetry={refetch} />
      ) : null}

      {!isLoading && data !== undefined ? (
        data.data.length === 0 ? (
          <p className="feedback">
            Không có báo cáo nào ở trạng thái {REPORT_STATUS_LABELS[status]}.
          </p>
        ) : (
          <>
            <ul className="review-queue">
              {data.data.map((report) => {
                const link = targetLink(report);
                return (
                  <li key={report.id} className="review-row">
                    <div className="review-row__body">
                      <div className="review-row__heading">
                        <span className="review-row__name">
                          {REPORT_REASON_LABELS[report.reason]}
                        </span>
                        <span className="badge">{REPORT_TARGET_LABELS[report.targetType]}</span>
                        {report.status === 'open' ? (
                          <span className="pill pill--warning">
                            Chờ {hoursWaiting(report.createdAt)} giờ
                          </span>
                        ) : (
                          <span className="pill pill--success">
                            {REPORT_STATUS_LABELS[report.status]}
                          </span>
                        )}
                      </div>
                      <p className="review-row__meta">
                        {link !== null ? (
                          <Link to={link}>{report.targetId}</Link>
                        ) : (
                          <span>{report.targetId}</span>
                        )}
                        <span>{new Date(report.createdAt).toLocaleString('vi-VN')}</span>
                      </p>
                      <p className="report-row__description">{report.description}</p>
                      {report.resolutionNote !== null ? (
                        <p className="review-row__email">Ghi chú xử lý: {report.resolutionNote}</p>
                      ) : null}
                    </div>
                    {report.status === 'open' ? (
                      <div className="review-actions">
                        <button
                          type="button"
                          className="button button--primary"
                          onClick={() => {
                            setTarget({ report, action: 'resolved' });
                            setNote('');
                          }}
                        >
                          Đánh dấu đã xử lý
                        </button>
                        <button
                          type="button"
                          className="button button--secondary"
                          onClick={() => {
                            setTarget({ report, action: 'dismissed' });
                            setNote('');
                          }}
                        >
                          Bỏ qua
                        </button>
                      </div>
                    ) : null}
                  </li>
                );
              })}
            </ul>
            {data.meta !== undefined && data.meta.totalPages > 1 ? (
              <Pagination meta={data.meta} onPageChange={setPage} />
            ) : null}
          </>
        )
      ) : null}

      {target !== null ? (
        <div className="modal" role="dialog" aria-modal="true" aria-labelledby="resolve-title">
          <div className="modal__card">
            <h2 id="resolve-title">
              {target.action === 'resolved' ? 'Đánh dấu đã xử lý' : 'Bỏ qua báo cáo'}
            </h2>
            <p className="page__subtitle">
              {REPORT_REASON_LABELS[target.report.reason]} · {target.report.targetId}
            </p>
            <label className="form-field">
              <span>Ghi chú xử lý (bắt buộc)</span>
              <textarea
                className="textarea"
                value={note}
                onChange={(event) => setNote(event.target.value)}
                rows={3}
                minLength={5}
                placeholder="Đã làm gì với báo cáo này?"
              />
            </label>
            <div className="form-actions">
              <button
                type="button"
                className="button button--primary"
                disabled={note.trim().length < 5 || resolve.isPending}
                onClick={confirm}
              >
                {resolve.isPending ? 'Đang lưu...' : 'Xác nhận'}
              </button>
              <button type="button" className="button button--ghost" onClick={() => setTarget(null)}>
                Hủy
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
};
