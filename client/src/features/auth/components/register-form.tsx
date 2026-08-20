import { useState, type FormEvent } from 'react';
import { Link } from 'react-router';
import { Button, Checkbox, Input, RadioGroup } from '../../../shared/components/ui';
import {
  SELF_REGISTER_ROLES,
  ROLE_LABELS,
  type RegisterInput,
  type SelfRegisterRole,
} from '../types/auth-types';
import { AuthError } from './auth-error';

const ROLE_OPTIONS = SELF_REGISTER_ROLES.map((role) => ({
  value: role,
  label: ROLE_LABELS[role],
}));

export interface RegisterFormProps {
  readonly onSubmit: (input: RegisterInput) => Promise<void>;
}

export const RegisterForm = ({ onSubmit }: RegisterFormProps) => {
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<SelfRegisterRole>('brand');
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<unknown>(null);

  const handleSubmit = async (event: FormEvent): Promise<void> => {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      await onSubmit({ displayName, email, password, role, termsAccepted });
    } catch (submitError) {
      setError(submitError);
    } finally {
      setPending(false);
    }
  };

  return (
    <form className="auth-form" onSubmit={(event) => void handleSubmit(event)}>
      <AuthError error={error} />
      <RadioGroup
        legend="Bạn là"
        name="role"
        value={role}
        options={ROLE_OPTIONS}
        onChange={setRole}
      />
      <Input
        label="Tên hiển thị"
        value={displayName}
        onChange={(event) => setDisplayName(event.target.value)}
        minLength={2}
        maxLength={50}
        required
      />
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
        autoComplete="new-password"
        minLength={8}
        hint="Tối thiểu 8 ký tự, gồm chữ và số."
        required
      />
      <Checkbox
        variant="field"
        checked={termsAccepted}
        onChange={(event) => setTermsAccepted(event.target.checked)}
        label={
          <>
            {/* Mở tab mới: đọc điều khoản không được làm mất form đang điền dở. */}
            Tôi đồng ý với{' '}
            <Link to="/terms" target="_blank" rel="noopener noreferrer">
              Điều khoản sử dụng
            </Link>{' '}
            và{' '}
            <Link to="/privacy" target="_blank" rel="noopener noreferrer">
              Chính sách quyền riêng tư
            </Link>
            .
          </>
        }
      />
      <Button type="submit" variant="primary" loading={pending} disabled={!termsAccepted}>
        {pending ? 'Đang tạo tài khoản...' : 'Đăng ký'}
      </Button>
    </form>
  );
};
