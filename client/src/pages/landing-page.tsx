import { CreatorCard } from '../features/creators/components/creator-card';
import { LinkButton } from '../shared/components/ui';
import { useCreators } from '../features/creators/hooks/use-creators';
import { IconPackage, IconShield, IconStar } from '../shared/components/icons';

/** Ba bước của một booking — nói đúng cơ chế bảo vệ tiền, không hô khẩu hiệu. */
const STEPS = [
  {
    title: 'Chọn gói dịch vụ',
    body: 'Mỗi gói ghi rõ đầu ra, thời gian hoàn thành, số lần sửa và quyền sử dụng nội dung. Không có giá ẩn.',
  },
  {
    title: 'Thanh toán được giữ lại',
    body: 'Tiền chỉ chuyển cho creator sau khi bạn nghiệm thu. Hai bên trao đổi và nộp bài ngay trong booking.',
  },
  {
    title: 'Nghiệm thu rồi giải ngân',
    body: 'Duyệt nội dung hoặc yêu cầu sửa trong số lần đã mua. Có tranh chấp thì đội vận hành phân xử dựa trên brief đã chốt.',
  },
] as const;

const VALUE_PROPS = [
  {
    Icon: IconPackage,
    title: 'Giá và đầu ra công khai',
    body: 'Xem trước chính xác thứ bạn mua — số video, định dạng, deadline, quyền chạy quảng cáo.',
  },
  {
    Icon: IconShield,
    title: 'Thanh toán có bảo đảm',
    body: 'Không ai phải làm trước hay trả trước cho người lạ. Nền tảng giữ tiền tới lúc nghiệm thu.',
  },
  {
    Icon: IconStar,
    title: 'Đánh giá từ giao dịch thật',
    body: 'Chỉ booking hoàn thành mới tạo được đánh giá, nên điểm số phản ánh đúng năng lực.',
  },
] as const;

/** Trang chủ công khai — bộ mặt sản phẩm cho khách chưa đăng nhập. */
export const LandingPage = () => {
  const { data } = useCreators({ sort: 'rating', page: 1, limit: 3 });
  const featured = data?.data ?? [];

  return (
    <div className="landing">
      <section className="hero">
        <div className="hero__body">
          <p className="hero__eyebrow">Dành cho local brand tại Việt Nam</p>
          <h1 className="hero__title">
            Đặt lịch creator địa phương — rõ giá, rõ deadline, rõ quyền sử dụng
          </h1>
          <p className="hero__lede">
            Nền tảng booking trực tiếp giữa thương hiệu và nano/micro/UGC creator. Chọn gói dịch
            vụ chuẩn hóa, thanh toán được giữ lại tới khi bạn nghiệm thu nội dung.
          </p>
          <div className="hero__actions">
            <LinkButton to="/creators">
              Tìm creator
            </LinkButton>
            <LinkButton to="/register" variant="secondary">
              Đăng ký làm creator
            </LinkButton>
          </div>
          <p className="hero__note">Miễn phí tạo tài khoản · Chỉ tính phí khi booking thành công</p>
        </div>
      </section>

      <section className="landing-section">
        <div className="value-grid">
          {VALUE_PROPS.map(({ Icon, title, body }) => (
            <article key={title} className="value-card">
              <span className="value-card__icon" aria-hidden="true">
                <Icon />
              </span>
              <h2>{title}</h2>
              <p>{body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="landing-section">
        <header className="landing-section__head">
          <h2>Một booking diễn ra thế nào</h2>
          <p>Ba bước, mọi điều khoản được khóa lại từ lúc hai bên đồng ý.</p>
        </header>
        <ol className="step-list">
          {STEPS.map((step, index) => (
            <li key={step.title} className="step-item">
              <span className="step-item__num" aria-hidden="true">
                {index + 1}
              </span>
              <div>
                <h3>{step.title}</h3>
                <p>{step.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {featured.length > 0 ? (
        <section className="landing-section">
          <header className="landing-section__head landing-section__head--row">
            <div>
              <h2>Creator nổi bật</h2>
              <p>Đánh giá cao nhất từ các booking đã hoàn thành.</p>
            </div>
            <LinkButton to="/creators" variant="secondary">
              Xem tất cả
            </LinkButton>
          </header>
          <div className="creator-grid">
            {featured.map((creator) => (
              <CreatorCard key={creator.id} creator={creator} />
            ))}
          </div>
        </section>
      ) : null}

      <section className="cta-band">
        <h2>Sẵn sàng cho chiến dịch tiếp theo?</h2>
        <p>Tạo tài khoản trong một phút và gửi yêu cầu booking đầu tiên.</p>
        <LinkButton to="/register">
          Bắt đầu miễn phí
        </LinkButton>
      </section>
    </div>
  );
};
