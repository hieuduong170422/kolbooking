import { useState, type FormEvent } from 'react';
import { Button, Input } from '../../../shared/components/ui';
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
      <Input
        label="Email"
        type="email"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        autoComplete="email"
        required
      />
      <Input
        label="Mật khẩu"
        type="password"
        value={password}
        onChange={(event) => setPassword(event.target.value)}
        autoComplete="current-password"
        required
      />
      <Button type="submit" variant="primary" loading={pending}>
        {pending ? 'Đang đăng nhập...' : 'Đăng nhập'}
      </Button>
    </form>
  );
};
