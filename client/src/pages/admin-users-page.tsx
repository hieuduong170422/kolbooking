import { useState, type FormEvent } from 'react';
import { useUserActions, useUsers } from '../features/admin/hooks/use-admin';
import {
  USER_STATUS_LABELS,
  type AdminUser,
  type UserStatus,
} from '../features/admin/types/admin-types';
import { AUTH_ROLES, ROLE_LABELS, type AuthRole } from '../features/auth/types/auth-types';
import { ApiClientError } from '../shared/api/api-types';
import { ErrorState } from '../shared/components/feedback/error-state';
import { LoadingState } from '../shared/components/feedback/loading-state';
import { IconSearch } from '../shared/components/icons';
import { Pagination } from '../shared/components/pagination/pagination';

const PAGE_LIMIT = 20;

/** Trang /admin/users — tìm, lọc và khóa/mở khóa tài khoản (ADM-002, ADM-004). */
export const AdminUsersPage = () => {
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [role, setRole] = useState<AuthRole | ''>('');
  const [status, setStatus] = useState<UserStatus | ''>('');
  const [page, setPage] = useState(1);
  const [lockTarget, setLockTarget] = useState<AdminUser | null>(null);
  const [reason, setReason] = useState('');
  const [actionError, setActionError] = useState<unknown>(null);

  const { data, isLoading, isError, refetch } = useUsers({
    ...(search !== '' ? { search } : {}),
    ...(role !== '' ? { role } : {}),
    ...(status !== '' ? { status } : {}),
    page,
    limit: PAGE_LIMIT,
  });
  const { lock, unlock } = useUserActions();

  const applySearch = (event: FormEvent): void => {
    event.preventDefault();
    setSearch(searchInput.trim());
    setPage(1);
  };

  const confirmLock = (): void => {
    if (lockTarget === null) return;
    setActionError(null);
    lock
      .mutateAsync({ userId: lockTarget.id, reason: reason.trim() })
      .then(() => {
        setLockTarget(null);
        setReason('');
      })
      .catch((error: unknown) => setActionError(error));
  };

  const handleUnlock = (user: AdminUser): void => {
    setActionError(null);
    unlock.mutateAsync(user.id).catch((error: unknown) => setActionError(error));
  };

  return (
    <section className="page">
      <div className="page__header">
        <h1>Tài khoản người dùng</h1>
        <p className="page__subtitle">
          Khóa tài khoản sẽ chặn đăng nhập và thu hồi mọi phiên đang mở (AUTH-006).
        </p>
      </div>

      <div className="creator-filters">
        <form className="admin-search" onSubmit={applySearch}>
          <input
            type="search"
            className="input"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder="Tìm theo email hoặc tên..."
            aria-label="Tìm tài khoản"
          />
          <button type="submit" className="button button--secondary">
            <IconSearch />
            Tìm
          </button>
        </form>
        <select
          className="select"
          value={role}
          aria-label="Lọc theo vai trò"
          onChange={(event) => {
            setRole(event.target.value as AuthRole | '');
            setPage(1);
          }}
        >
          <option value="">Tất cả vai trò</option>
          {AUTH_ROLES.map((option) => (
            <option key={option} value={option}>
              {ROLE_LABELS[option]}
            </option>
          ))}
        </select>
        <select
          className="select"
          value={status}
          aria-label="Lọc theo trạng thái"
          onChange={(event) => {
            setStatus(event.target.value as UserStatus | '');
            setPage(1);
          }}
        >
          <option value="">Tất cả trạng thái</option>
          <option value="active">{USER_STATUS_LABELS.active}</option>
          <option value="locked">{USER_STATUS_LABELS.locked}</option>
        </select>
      </div>

      {actionError instanceof ApiClientError ? (
        <div className="notice notice--warning" role="alert">
          <p>{actionError.message}</p>
        </div>
      ) : null}

      {isLoading ? <LoadingState message="Đang tải danh sách tài khoản..." /> : null}

      {isError || (!isLoading && data === undefined) ? (
        <ErrorState message="Không tải được danh sách tài khoản." onRetry={refetch} />
      ) : null}

      {!isLoading && data !== undefined ? (
        data.data.length === 0 ? (
          <p className="feedback">Không có tài khoản nào khớp bộ lọc.</p>
        ) : (
          <>
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Người dùng</th>
                    <th>Vai trò</th>
                    <th>Trạng thái</th>
                    <th>Ngày tạo</th>
                    <th aria-label="Hành động" />
                  </tr>
                </thead>
                <tbody>
                  {data.data.map((user) => (
                    <tr key={user.id}>
                      <td>
                        <div className="cell-user">
                          <span className="cell-user__avatar" aria-hidden="true">
                            {user.displayName.charAt(0).toUpperCase()}
                          </span>
                          <div>
                            <span className="cell-user__name">{user.displayName}</span>
                            <span className="cell-user__email">{user.email}</span>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className="badge">{ROLE_LABELS[user.role]}</span>
                      </td>
                      <td>
                        <span
                          className={`pill ${user.status === 'locked' ? 'pill--danger' : 'pill--success'}`}
                        >
                          {USER_STATUS_LABELS[user.status]}
                        </span>
                        {!user.emailVerified ? (
                          <span className="pill pill--warning">Chưa xác minh email</span>
                        ) : null}
                      </td>
                      <td className="cell-num">
                        {new Date(user.createdAt).toLocaleDateString('vi-VN')}
                      </td>
                      <td className="cell-actions">
                        {user.role === 'admin' ? (
                          <span className="cell-muted">Tài khoản quản trị</span>
                        ) : user.status === 'locked' ? (
                          <button
                            type="button"
                            className="button button--secondary"
                            disabled={unlock.isPending}
                            onClick={() => handleUnlock(user)}
                          >
                            Mở khóa
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="button button--danger"
                            onClick={() => {
                              setLockTarget(user);
                              setReason('');
                            }}
                          >
                            Khóa
                          </button>
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

      {lockTarget !== null ? (
        <div className="modal" role="dialog" aria-modal="true" aria-labelledby="lock-title">
          <div className="modal__card">
            <h2 id="lock-title">Khóa tài khoản {lockTarget.displayName}</h2>
            <p className="page__subtitle">
              {lockTarget.email} sẽ không đăng nhập được và mọi phiên hiện tại bị thu hồi.
            </p>
            <label className="form-field">
              <span>Lý do khóa (bắt buộc)</span>
              <textarea
                className="textarea"
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                rows={3}
                minLength={5}
                placeholder="VD: Spam brand nhiều lần sau cảnh báo."
              />
            </label>
            <div className="form-actions">
              <button
                type="button"
                className="button button--danger"
                disabled={reason.trim().length < 5 || lock.isPending}
                onClick={confirmLock}
              >
                {lock.isPending ? 'Đang khóa...' : 'Xác nhận khóa'}
              </button>
              <button
                type="button"
                className="button button--ghost"
                onClick={() => setLockTarget(null)}
              >
                Hủy
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
};
