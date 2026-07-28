import { ApiClientError } from '../../../shared/api/api-types';

/** Hiển thị lỗi từ API: message chính + danh sách lỗi validate theo field nếu có. */
export const AuthError = ({ error }: { error: unknown }) => {
  if (!error) return null;

  const message =
    error instanceof ApiClientError ? error.message : 'Đã xảy ra lỗi. Vui lòng thử lại.';
  const details = error instanceof ApiClientError ? error.details : [];

  return (
    <div className="form-error" role="alert">
      <p>{message}</p>
      {details.length > 0 ? (
        <ul>
          {details.map((detail) => (
            <li key={`${detail.field}-${detail.message}`}>{detail.message}</li>
          ))}
        </ul>
      ) : null}
    </div>
  );
};
