import { Link, Navigate, useNavigate } from 'react-router';
import { RegisterForm } from '../features/auth/components/register-form';
import { useAuth } from '../features/auth/store/use-auth';
import type { RegisterInput } from '../features/auth/types/auth-types';

export const RegisterPage = () => {
  const { status, user, register } = useAuth();
  const navigate = useNavigate();

  if (status === 'authenticated') {
    // Tài khoản mới chưa xác minh email → đưa thẳng tới màn nhập OTP (AUTH-002).
    return <Navigate to={user?.emailVerified ? '/dashboard' : '/verify-email'} replace />;
  }

  const handleRegister = async (input: RegisterInput): Promise<void> => {
    await register(input);
    navigate('/verify-email', { replace: true });
  };

  return (
    <section className="page page--narrow">
      <div className="auth-card">
        <h1>Tạo tài khoản</h1>
        <p className="page__subtitle">
          Brand tìm creator phù hợp — Creator nhận booking có bảo đảm.
        </p>
        <RegisterForm onSubmit={handleRegister} />
        <p className="auth-card__switch">
          Đã có tài khoản? <Link to="/login">Đăng nhập</Link>
        </p>
      </div>
    </section>
  );
};
