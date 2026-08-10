import { useState } from 'react';
import { useAuditEntries } from '../features/admin/hooks/use-admin';
import {
  AUDIT_ACTION_LABELS,
  AUDIT_TARGET_LABELS,
  AUDIT_TARGET_TYPES,
  type AuditTargetType,
} from '../features/admin/types/admin-types';
import { ErrorState } from '../shared/components/feedback/error-state';
import { LoadingState } from '../shared/components/feedback/loading-state';
import { Pagination } from '../shared/components/pagination/pagination';

const PAGE_LIMIT = 25;

/** Hiển thị chuyển trạng thái before → after nếu có. */
const transition = (before: unknown, after: unknown): string | null => {
  if (before === null && after === null) return null;
  return `${String(before ?? '—')} → ${String(after ?? '—')}`;
};

/** Trang /admin/audit — nhật ký thao tác, chỉ đọc (ADM-009, BR-015). */
export const AdminAuditPage = () => {
  const [targetType, setTargetType] = useState<AuditTargetType | ''>('');
  const [page, setPage] = useState(1);

  const { data, isLoading, isError, refetch } = useAuditEntries({
    ...(targetType !== '' ? { targetType } : {}),
    page,
    limit: PAGE_LIMIT,
  });

  return (
    <section className="page">
      <div className="page__header">
        <h1>Nhật ký hoạt động</h1>
        <p className="page__subtitle">
          Lịch sử bất biến của mọi thao tác quản trị — chỉ xem, không sửa hay xóa được (BR-015).
        </p>
      </div>

      <div className="creator-filters">
        <select
          className="select"
          value={targetType}
          aria-label="Lọc theo đối tượng"
          onChange={(event) => {
            setTargetType(event.target.value as AuditTargetType | '');
            setPage(1);
          }}
        >
          <option value="">Tất cả đối tượng</option>
          {AUDIT_TARGET_TYPES.map((option) => (
            <option key={option} value={option}>
              {AUDIT_TARGET_LABELS[option]}
            </option>
          ))}
        </select>
      </div>

      {isLoading ? <LoadingState message="Đang tải nhật ký..." /> : null}

      {isError || (!isLoading && data === undefined) ? (
        <ErrorState message="Không tải được nhật ký hoạt động." onRetry={refetch} />
      ) : null}

      {!isLoading && data !== undefined ? (
        data.data.length === 0 ? (
          <p className="feedback">Chưa có thao tác nào được ghi nhận.</p>
        ) : (
          <>
            <ol className="audit-log">
              {data.data.map((entry) => {
                const change = transition(entry.before, entry.after);
                return (
                  <li key={entry.id} className="audit-entry">
                    <div className="audit-entry__time">
                      <span>{new Date(entry.createdAt).toLocaleTimeString('vi-VN')}</span>
                      <span>{new Date(entry.createdAt).toLocaleDateString('vi-VN')}</span>
                    </div>
                    <div className="audit-entry__body">
                      <div className="audit-entry__head">
                        <span className="audit-entry__action">
                          {AUDIT_ACTION_LABELS[entry.action] ?? entry.action}
                        </span>
                        <span className="badge">
                          {AUDIT_TARGET_LABELS[entry.targetType as AuditTargetType] ??
                            entry.targetType}
                        </span>
                        {change !== null ? (
                          <span className="audit-entry__change">{change}</span>
                        ) : null}
                      </div>
                      <p className="audit-entry__meta">
                        {entry.actorEmail} · <code>{entry.targetId}</code>
                      </p>
                      {entry.reason !== null ? (
                        <p className="audit-entry__reason">Lý do: {entry.reason}</p>
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ol>
            {data.meta !== undefined && data.meta.totalPages > 1 ? (
              <Pagination meta={data.meta} onPageChange={setPage} />
            ) : null}
          </>
        )
      ) : null}
    </section>
  );
};
