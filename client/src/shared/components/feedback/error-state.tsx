import { Button } from '../ui';

interface ErrorStateProps {
  readonly message: string;
  readonly onRetry?: () => void;
}

export const ErrorState = ({ message, onRetry }: ErrorStateProps) => (
  <div className="feedback feedback--error" role="alert">
    <p>{message}</p>
    {onRetry ? <Button onClick={onRetry}>Thử lại</Button> : null}
  </div>
);
