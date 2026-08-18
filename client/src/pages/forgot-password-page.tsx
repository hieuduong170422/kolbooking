import { useState, type FormEvent } from 'react';
import { Link } from 'react-router';
import { forgotPassword, resetPassword } from '../features/auth/api/auth-api';
import { AuthError } from '../features/auth/components/auth-error';
import { Button, Input, LinkButton } from '../shared/components/ui';

type Step = 'request' | 'reset' | 'done';

const OTP_LENGTH = 6;

/**
 * AUTH-004 — quên mật khẩu: nhập email nhận mã → nhập mã + mật khẩu mới.
 * Server luôn trả 200 ở bước gửi mã (không lộ email có tài khoản hay không).
 */
export const ForgotPasswordPage = () => {
  const [step, setStep] = useState<Step>('request');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<unknown>(null);

  const handleRequest = async (event: FormEvent): Promise<void> => {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      await forgotPassword(email);
      setStep('reset');
    } catch (requestError) {
      setError(requestError);
    } finally {
      setPending(false);
    }
  };

  const handleReset = async (event: FormEvent): Promise<void> => {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      await resetPassword({ email, code, newPassword });
      setStep('done');
    } catch (resetError) {
      setError(resetError);
    } finally {
      setPending(false);
    }
  };

  return (
    <section className="page page--narrow">
      <div className="auth-card">
        <h1>Quên mật khẩu</h1>

        {step === 'request' ? (
          <>
            <p className="page__subtitle">
              Nhập email đăng ký — nếu tài khoản tồn tại, chúng tôi sẽ gửi mã đặt lại mật khẩu.
            </p>
            <form className="auth-form" onSubmit={(event) => void handleRequest(event)}>
              <AuthError error={error} />
              <Input
                label="Email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="email"
                required
              />
              <Button type="submit" variant="primary" loading={pending}>
                {pending ? 'Đang gửi mã...' : 'Gửi mã đặt lại'}
              </Button>
            </form>
          </>
        ) : null}

        {step === 'reset' ? (
          <>
            <p className="page__subtitle">
              Nhập mã 6 chữ số đã gửi tới <strong>{email}</strong> và mật khẩu mới.
            </p>
            <form className="auth-form" onSubmit={(event) => void handleReset(event)}>
              <AuthError error={error} />
              <Input
                label="Mã xác nhận"
                className="input--otp"
                inputMode="numeric"
                autoComplete="one-time-code"
                value={code}
                onChange={(event) => setCode(event.target.value.replace(/\D/g, ''))}
                minLength={OTP_LENGTH}
                maxLength={OTP_LENGTH}
                pattern="\d{6}"
                placeholder="000000"
                required
              />
              <Input
                label="Mật khẩu mới"
                type="password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                autoComplete="new-password"
                minLength={8}
                hint="Tối thiểu 8 ký tự, gồm chữ và số."
                required
              />
              <Button
                type="submit"
                variant="primary"
                loading={pending}
                disabled={code.length !== OTP_LENGTH}
              >
                {pending ? 'Đang đặt lại...' : 'Đặt lại mật khẩu'}
              </Button>
            </form>
            <p className="auth-card__switch">
              Chưa nhận được mã?{' '}
              <Button variant="link" onClick={() => setStep('request')} disabled={pending}>
                Gửi lại
              </Button>
            </p>
          </>
        ) : null}

        {step === 'done' ? (
          <>
            <p className="form-success">
              Mật khẩu đã được đặt lại thành công. Đăng nhập bằng mật khẩu mới để tiếp tục.
            </p>
            <LinkButton to="/login">Về trang đăng nhập</LinkButton>
          </>
        ) : null}

        {step !== 'done' ? (
          <p className="auth-card__switch">
            Nhớ ra mật khẩu? <Link to="/login">Đăng nhập</Link>
          </p>
        ) : null}
      </div>
    </section>
  );
};
