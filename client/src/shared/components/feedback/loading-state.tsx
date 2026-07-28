export const LoadingState = ({ message = 'Đang tải dữ liệu...' }: { message?: string }) => (
  <div className="feedback feedback--loading" role="status" aria-live="polite">
    <span className="feedback__spinner" aria-hidden="true" />
    <p>{message}</p>
  </div>
);
