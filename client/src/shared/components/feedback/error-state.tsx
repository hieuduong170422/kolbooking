interface ErrorStateProps {
  readonly message: string;
  readonly onRetry?: () => void;
}

export const ErrorState = ({ message, onRetry }: ErrorStateProps) => (
  <div className="feedback feedback--error" role="alert">
    <p>{message}</p>
    {onRetry ? (
      <button type="button" className="button button--secondary" onClick={onRetry}>
        Thử lại
      </button>
    ) : null}
  </div>
);
