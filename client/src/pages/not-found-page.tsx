import { useAuth } from '../features/auth/store/use-auth';
import { LinkButton } from '../shared/components/ui';

/**
 * 404 — cho người dùng lối ra thay vì một ngõ cụt.
 *
 * Lối ra phụ đổi theo trạng thái đăng nhập: người chưa đăng nhập hay tới đây
 * vì gõ nhầm URL hoặc mở link cũ, nên "Đăng nhập" là bước kế tiếp hợp lý;
 * người đã đăng nhập thì Dashboard mới là chỗ họ muốn về.
 */
export const NotFoundPage = () => {
  const { status } = useAuth();
  const isAuthenticated = status === 'authenticated';

  return (
    <section className="page page--center">
      <h1>404</h1>
      <p>Trang bạn tìm không tồn tại hoặc đã bị di chuyển.</p>
      <div className="page__actions">
        <LinkButton to="/creators">Khám phá creator</LinkButton>
        <LinkButton to={isAuthenticated ? '/dashboard' : '/login'} variant="secondary">
          {isAuthenticated ? 'Về dashboard' : 'Đăng nhập'}
        </LinkButton>
        <LinkButton to="/" variant="link">
          Về trang chủ
        </LinkButton>
      </div>
    </section>
  );
};
