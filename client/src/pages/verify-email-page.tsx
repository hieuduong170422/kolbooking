import { useState, type FormEvent } from 'react';
import { Navigate, useNavigate } from 'react-router';
import {
  confirmEmailVerification,
  requestEmailVerification,
} from '../features/auth/api/auth-api';
import { AuthError } from '../features/auth/components/auth-error';
import { useAuth } from '../features/auth/store/use-auth';

const OTP_LENGTH = 6;

/**
 * AUTH-002 — nhập mã OTP đã gửi qua email sau khi đăng ký.
 * Xác minh xong: creator đi tiếp onboarding, brand về dashboard.
 */
export const VerifyEmailPage = () => {
  const { user, updateUser } = useAuth();
  const navigate = useNavigate();
  const [code, setCode] = useState('');
  const [pending, setPending] = useState(false);
  const [resent, setResent] = useState(false);
  const [error, setError] = useState<unknown>(null);

  if (!user) return null;
  if (user.emailVerified) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleConfirm = async (event: FormEvent): Promise<void> => {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      const verified = await confirmEmailVerification(code);
      updateUser(verified);
      navigate(user.role === 'creator' ? '/onboarding' : '/dashboard', { replace: true });
    } catch (confirmError) {
      setError(confirmError);
    } finally {
      setPending(false);
    }
  };

  const handleResend = async (): Promise<void> => {
    setPending(true);
    setError(null);
    setResent(false);
    try {
      await requestEmailVerification();
      setResent(true);
    } catch (resendError) {
      setError(resendError);
    } finally {
      setPending(false);
    }
  };

  return (
    <section className="page page--narrow">
      <div className="auth-card">
        <h1>Xác minh email</h1>
        <p className="page__subtitle">
          Chúng tôi đã gửi mã 6 chữ số tới <strong>{user.email}</strong>. Nhập mã để kích hoạt
          đầy đủ tài khoản.
        </p>
        <form className="auth-form" onSubmit={(event) => void handleConfirm(event)}>
          <AuthError error={error} />
          {resent ? <p className="form-success">Đã gửi lại mã — kiểm tra hộp thư của bạn.</p> : null}
          <label className="form-field">
            <span>Mã xác minh</span>
            <input
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              className="input input--otp"
              value={code}
              onChange={(event) => setCode(event.target.value.replace(/\D/g, ''))}
              minLength={OTP_LENGTH}
              maxLength={OTP_LENGTH}
              pattern="\d{6}"
              placeholder="000000"
              required
            />
          </label>
          <button
            type="submit"
            className="button button--primary"
            disabled={pending || code.length !== OTP_LENGTH}
          >
            {pending ? 'Đang xác minh...' : 'Xác minh'}
          </button>
        </form>
        <p className="auth-card__switch">
          Chưa nhận được mã?{' '}
          <button
            type="button"
            className="button-link"
            onClick={() => void handleResend()}
            disabled={pending}
          >
            Gửi lại mã
          </button>
        </p>
      </div>
    </section>
  );
};
