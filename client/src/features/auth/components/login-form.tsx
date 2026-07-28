import { useState, type FormEvent } from 'react';
import type { LoginInput } from '../types/auth-types';
import { AuthError } from './auth-error';

interface LoginFormProps {
  readonly onSubmit: (input: LoginInput) => Promise<void>;
}

export const LoginForm = ({ onSubmit }: LoginFormProps) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<unknown>(null);

  const handleSubmit = async (event: FormEvent): Promise<void> => {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      await onSubmit({ email, password });
    } catch (submitError) {
      setError(submitError);
    } finally {
      setPending(false);
    }
  };

  return (
    <form className="auth-form" onSubmit={(event) => void handleSubmit(event)}>
      <AuthError error={error} />
      <label className="form-field">
        <span>Email</span>
        <input
          type="email"
          className="input"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          autoComplete="email"
          required
        />
      </label>
      <label className="form-field">
        <span>Mật khẩu</span>
        <input
          type="password"
          className="input"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          autoComplete="current-password"
          required
        />
      </label>
      <button type="submit" className="button button--primary" disabled={pending}>
        {pending ? 'Đang đăng nhập...' : 'Đăng nhập'}
      </button>
    </form>
  );
};
