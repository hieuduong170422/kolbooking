import { LinkButton } from '../shared/components/ui';

export const NotFoundPage = () => (
  <section className="page page--center">
    <h1>404</h1>
    <p>Trang bạn tìm không tồn tại hoặc đã bị di chuyển.</p>
    <LinkButton to="/creators">
      Về trang khám phá creator
    </LinkButton>
  </section>
);
