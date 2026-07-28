import { Link } from 'react-router';

export const NotFoundPage = () => (
  <section className="page page--center">
    <h1>404</h1>
    <p>Trang bạn tìm không tồn tại hoặc đã bị di chuyển.</p>
    <Link to="/creators" className="button button--primary">
      Về trang khám phá creator
    </Link>
  </section>
);
