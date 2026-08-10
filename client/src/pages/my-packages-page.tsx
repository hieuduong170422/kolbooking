import { useState } from 'react';
import { Link } from 'react-router';
import { PackageForm } from '../features/packages/components/package-form';
import { useMyPackages, usePackageActions } from '../features/packages/hooks/use-my-packages';
import {
  PACKAGE_STATUS_LABELS,
  type PackageInput,
  type PackageOwner,
} from '../features/packages/types/package-types';
import { useCreatorProfile } from '../features/creators/hooks/use-creator-profile';
import { ApiClientError } from '../shared/api/api-types';
import { ErrorState } from '../shared/components/feedback/error-state';
import { LoadingState } from '../shared/components/feedback/loading-state';
import { formatVnd } from '../shared/utils/format';

type EditorState = { mode: 'closed' } | { mode: 'create' } | { mode: 'edit'; pkg: PackageOwner };

const STATUS_BADGE_CLASS: Record<PackageOwner['status'], string> = {
  draft: 'badge',
  published: 'badge badge--success',
  unpublished: 'badge badge--muted',
  hidden: 'badge badge--danger',
};

/** Trang /my-packages — creator quản lý service package (PKG-001, PKG-007). */
export const MyPackagesPage = () => {
  const { data: packages, isLoading, isError, error, refetch } = useMyPackages();
  const { data: profile } = useCreatorProfile();
  const actions = usePackageActions();
  const [editor, setEditor] = useState<EditorState>({ mode: 'closed' });
  const [actionError, setActionError] = useState<unknown>(null);

  if (isLoading) {
    return (
      <section className="page">
        <LoadingState message="Đang tải package..." />
      </section>
    );
  }

  // Chưa có hồ sơ creator → hướng sang onboarding trước (PROFILE_NOT_FOUND).
  if (isError && error instanceof ApiClientError && error.code === 'PROFILE_NOT_FOUND') {
    return (
      <section className="page page--center">
        <h1>Chưa có hồ sơ creator</h1>
        <p className="page__subtitle">Bạn cần tạo hồ sơ creator trước khi tạo package.</p>
        <Link to="/onboarding" className="button button--primary">
          Tạo hồ sơ ngay
        </Link>
      </section>
    );
  }

  if (isError || packages === undefined) {
    return (
      <section className="page">
        <ErrorState message="Không tải được danh sách package." onRetry={refetch} />
      </section>
    );
  }

  const isVerified = profile?.status === 'verified';

  const handleCreate = async (input: PackageInput): Promise<void> => {
    await actions.create.mutateAsync(input);
    setEditor({ mode: 'closed' });
  };

  const handleUpdate = async (id: string, input: PackageInput): Promise<void> => {
    await actions.update.mutateAsync({ id, input });
    setEditor({ mode: 'closed' });
  };

  /** Publish/unpublish/xóa — lỗi hiển thị đầu trang, không nuốt (error handling). */
  const runAction = (action: Promise<unknown>): void => {
    setActionError(null);
    action.catch((err: unknown) => setActionError(err));
  };

  return (
    <section className="page">
      <div className="page__header page__header--row">
        <div>
          <h1>Gói dịch vụ của tôi</h1>
          <p className="page__subtitle">
            Tạo package chuẩn hóa: đầu ra, giá, deadline và quyền sử dụng rõ ràng.
          </p>
        </div>
        {editor.mode === 'closed' ? (
          <button
            type="button"
            className="button button--primary"
            onClick={() => setEditor({ mode: 'create' })}
          >
            + Tạo package
          </button>
        ) : null}
      </div>

      {!isVerified ? (
        <div className="notice notice--warning">
          <p>
            Hồ sơ creator chưa được duyệt — bạn vẫn tạo được bản nháp nhưng chỉ creator Verified
            mới publish package (BR-001).
          </p>
        </div>
      ) : null}

      {actionError instanceof ApiClientError ? (
        <div className="notice notice--warning" role="alert">
          <p>{actionError.message}</p>
        </div>
      ) : null}

      {editor.mode === 'create' ? (
        <div className="dashboard-card">
          <h2>Tạo package mới</h2>
          <PackageForm onSubmit={handleCreate} onCancel={() => setEditor({ mode: 'closed' })} />
        </div>
      ) : null}

      {editor.mode === 'edit' ? (
        <div className="dashboard-card">
          <h2>Sửa: {editor.pkg.name}</h2>
          <PackageForm
            initial={editor.pkg}
            onSubmit={(input) => handleUpdate(editor.pkg.id, input)}
            onCancel={() => setEditor({ mode: 'closed' })}
          />
        </div>
      ) : null}

      {packages.length === 0 && editor.mode === 'closed' ? (
        <p className="feedback">
          Chưa có package nào. Tạo package đầu tiên để brand có thể booking bạn.
        </p>
      ) : null}

      <ul className="package-list">
        {packages.map((pkg) => (
          <li key={pkg.id} className="package-row">
            <div className="package-row__body">
              <div className="package-row__heading">
                <span className="package-row__name">{pkg.name}</span>
                <span className={STATUS_BADGE_CLASS[pkg.status]}>
                  {PACKAGE_STATUS_LABELS[pkg.status]}
                </span>
              </div>
              <p className="package-row__meta">
                <strong>{formatVnd(pkg.priceVnd)}</strong>
                <span>{pkg.turnaroundDays} ngày</span>
                <span>{pkg.revisionsIncluded} lần sửa</span>
                <span>{pkg.platforms.join(', ')}</span>
                <span>v{pkg.version}</span>
              </p>
              {pkg.status === 'hidden' && pkg.statusReason !== null ? (
                <p className="package-row__reason">Lý do ẩn: {pkg.statusReason}</p>
              ) : null}
            </div>
            <div className="package-row__actions">
              {pkg.status !== 'hidden' ? (
                <button
                  type="button"
                  className="button button--secondary"
                  onClick={() => setEditor({ mode: 'edit', pkg })}
                >
                  Sửa
                </button>
              ) : null}
              {(pkg.status === 'draft' || pkg.status === 'unpublished') ? (
                <button
                  type="button"
                  className="button button--primary"
                  disabled={!isVerified || actions.publish.isPending}
                  title={!isVerified ? 'Chỉ creator Verified mới publish (BR-001)' : undefined}
                  onClick={() => runAction(actions.publish.mutateAsync(pkg.id))}
                >
                  Publish
                </button>
              ) : null}
              {pkg.status === 'published' ? (
                <button
                  type="button"
                  className="button button--secondary"
                  disabled={actions.unpublish.isPending}
                  onClick={() => runAction(actions.unpublish.mutateAsync(pkg.id))}
                >
                  Gỡ bán
                </button>
              ) : null}
              {pkg.status === 'draft' ? (
                <button
                  type="button"
                  className="button button--danger"
                  disabled={actions.removeDraft.isPending}
                  onClick={() => runAction(actions.removeDraft.mutateAsync(pkg.id))}
                >
                  Xóa
                </button>
              ) : null}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
};
