import { useState, type FormEvent } from 'react';
import {
  SELF_REGISTER_ROLES,
  ROLE_LABELS,
  type RegisterInput,
  type SelfRegisterRole,
} from '../types/auth-types';
import { AuthError } from './auth-error';

interface RegisterFormProps {
  readonly onSubmit: (input: RegisterInput) => Promise<void>;
}

export const RegisterForm = ({ onSubmit }: RegisterFormProps) => {
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<SelfRegisterRole>('brand');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<unknown>(null);

  const handleSubmit = async (event: FormEvent): Promise<void> => {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      await onSubmit({ displayName, email, password, role });
    } catch (submitError) {
      setError(submitError);
    } finally {
      setPending(false);
    }
  };

  return (
    <form className="auth-form" onSubmit={(event) => void handleSubmit(event)}>
      <AuthError error={error} />
      <fieldset className="radio-group">
        <legend>Bạn là</legend>
        {SELF_REGISTER_ROLES.map((option) => (
          <label key={option} className="radio-option">
            <input
              type="radio"
              name="role"
              value={option}
              checked={role === option}
              onChange={() => setRole(option)}
            />
            <span>{ROLE_LABELS[option]}</span>
          </label>
        ))}
      </fieldset>
      <label className="form-field">
        <span>Tên hiển thị</span>
        <input
          type="text"
          className="input"
          value={displayName}
          onChange={(event) => setDisplayName(event.target.value)}
          minLength={2}
          maxLength={50}
          required
        />
      </label>
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
          autoComplete="new-password"
          minLength={8}
          required
        />
        <small>Tối thiểu 8 ký tự, gồm chữ và số.</small>
      </label>
      <button type="submit" className="button button--primary" disabled={pending}>
        {pending ? 'Đang tạo tài khoản...' : 'Đăng ký'}
      </button>
    </form>
  );
};
