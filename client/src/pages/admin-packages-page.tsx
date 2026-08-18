import { useState } from 'react';
import { Link } from 'react-router';
import {
  useAdminPackages,
  usePackageModeration,
} from '../features/packages/hooks/use-my-packages';
import {
  PACKAGE_STATUSES,
  PACKAGE_STATUS_LABELS,
  type PackageAdmin,
  type PackageStatus,
} from '../features/packages/types/package-types';
import { ApiClientError } from '../shared/api/api-types';
import { ErrorState } from '../shared/components/feedback/error-state';
import { LoadingState } from '../shared/components/feedback/loading-state';
import { Pagination } from '../shared/components/pagination/pagination';
import { Button, Modal, Tabs, Textarea } from '../shared/components/ui';
import { formatVnd } from '../shared/utils/format';

const PAGE_LIMIT = 20;

const STATUS_PILL: Record<PackageStatus, string> = {
  draft: 'pill pill--muted',
  published: 'pill pill--success',
  unpublished: 'pill pill--muted',
  hidden: 'pill pill--danger',
};

/** Trang /admin/packages — ẩn/khôi phục package vi phạm (PKG-010, ADM-010). */
export const AdminPackagesPage = () => {
  const [status, setStatus] = useState<PackageStatus | ''>('');
  const [page, setPage] = useState(1);
  const [hideTarget, setHideTarget] = useState<PackageAdmin | null>(null);
  const [reason, setReason] = useState('');
  const [actionError, setActionError] = useState<unknown>(null);

  const { data, isLoading, isError, refetch } = useAdminPackages({
    ...(status !== '' ? { status } : {}),
    page,
    limit: PAGE_LIMIT,
  });
  const { hide, unhide } = usePackageModeration();

  const confirmHide = (): void => {
    if (hideTarget === null) return;
    setActionError(null);
    hide
      .mutateAsync({ id: hideTarget.id, reason: reason.trim() })
      .then(() => {
        setHideTarget(null);
        setReason('');
      })
      .catch((error: unknown) => setActionError(error));
  };

  const handleUnhide = (pkg: PackageAdmin): void => {
    setActionError(null);
    unhide.mutateAsync(pkg.id).catch((error: unknown) => setActionError(error));
  };

  return (
    <section className="page">
      <div className="page__header">
        <h1>Kiểm duyệt package</h1>
        <p className="page__subtitle">
          Package bị ẩn biến mất khỏi tìm kiếm ngay. Khôi phục đưa package về trạng thái đã gỡ —
          creator tự publish lại.
        </p>
      </div>

      <Tabs
        label="Lọc theo trạng thái"
        value={status}
        options={[
          { key: 'all', value: '' as PackageStatus | '', label: 'Tất cả' },
          ...PACKAGE_STATUSES.map((item) => ({
            key: item,
            value: item as PackageStatus | '',
            label: PACKAGE_STATUS_LABELS[item],
          })),
        ]}
        onChange={(next) => {
          setStatus(next);
          setPage(1);
        }}
      />

      {actionError instanceof ApiClientError ? (
        <div className="notice notice--warning" role="alert">
          <p>{actionError.message}</p>
        </div>
      ) : null}

      {isLoading ? <LoadingState message="Đang tải package..." /> : null}
      {isError || (!isLoading && data === undefined) ? (
        <ErrorState message="Không tải được danh sách package." onRetry={refetch} />
      ) : null}

      {!isLoading && data !== undefined ? (
        data.data.length === 0 ? (
          <p className="feedback">Không có package nào khớp bộ lọc.</p>
        ) : (
          <>
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Package</th>
                    <th>Creator</th>
                    <th>Giá</th>
                    <th>Trạng thái</th>
                    <th aria-label="Hành động" />
                  </tr>
                </thead>
                <tbody>
                  {data.data.map((pkg) => (
                    <tr key={pkg.id}>
                      <td>
                        <span className="cell-user__name">{pkg.name}</span>
                        <span className="cell-user__email">
                          {pkg.category} · {pkg.platforms.join(', ')} · v{pkg.version}
                        </span>
                      </td>
                      <td>
                        <Link to={`/creators/${pkg.creatorId}`}>{pkg.creatorName}</Link>
                      </td>
                      <td className="cell-num">{formatVnd(pkg.priceVnd)}</td>
                      <td>
                        <span className={STATUS_PILL[pkg.status]}>
                          {PACKAGE_STATUS_LABELS[pkg.status]}
                        </span>
                        {pkg.statusReason !== null ? (
                          <span className="cell-user__email">{pkg.statusReason}</span>
                        ) : null}
                      </td>
                      <td className="cell-actions">
                        {pkg.status === 'hidden' ? (
                          <Button size="sm" disabled={unhide.isPending} onClick={() => handleUnhide(pkg)}>
                            Khôi phục
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="danger"
                            onClick={() => {
                              setHideTarget(pkg);
                              setReason('');
                            }}
                          >
                            Ẩn
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {data.meta !== undefined && data.meta.totalPages > 1 ? (
              <Pagination meta={data.meta} onPageChange={setPage} />
            ) : null}
          </>
        )
      ) : null}

      {hideTarget !== null ? (
        <Modal
          title="Ẩn package"
          description={`${hideTarget.name} — của ${hideTarget.creatorName}. Package sẽ biến mất khỏi tìm kiếm và creator không sửa được cho tới khi khôi phục.`}
          onClose={() => setHideTarget(null)}
          footer={
            <>
              <Button variant="ghost" onClick={() => setHideTarget(null)}>
                Hủy
              </Button>
              <Button
                variant="danger"
                loading={hide.isPending}
                disabled={reason.trim().length < 5}
                onClick={confirmHide}
              >
                {hide.isPending ? 'Đang ẩn...' : 'Xác nhận ẩn'}
              </Button>
            </>
          }
        >
          <Textarea
            label="Lý do ẩn (bắt buộc)"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            rows={3}
            minLength={5}
            placeholder="VD: Nội dung sai lệch giá niêm yết."
          />
        </Modal>
      ) : null}
    </section>
  );
};
