import { Link, Navigate, useLocation, useNavigate } from 'react-router';
import { LoginForm } from '../features/auth/components/login-form';
import { useAuth } from '../features/auth/store/use-auth';
import type { LoginInput } from '../features/auth/types/auth-types';

export const LoginPage = () => {
  const { status, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from ?? '/dashboard';

  if (status === 'authenticated') {
    return <Navigate to={from} replace />;
  }

  const handleLogin = async (input: LoginInput): Promise<void> => {
    await login(input);
    navigate(from, { replace: true });
  };

  return (
    <section className="page page--narrow">
      <div className="auth-card">
        <h1>Đăng nhập</h1>
        <p className="page__subtitle">Chào mừng quay lại KOL Booking.</p>
        <LoginForm onSubmit={handleLogin} />
        <p className="auth-card__switch">
          Chưa có tài khoản? <Link to="/register">Đăng ký</Link>
        </p>
        <p className="auth-card__hint">
          Tài khoản demo: creator@demo.vn / brand@demo.vn — mật khẩu <code>Demo@1234</code>
        </p>
      </div>
    </section>
  );
};
