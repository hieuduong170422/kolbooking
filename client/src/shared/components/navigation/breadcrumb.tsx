import { Fragment } from 'react';
import { Link } from 'react-router';

export interface BreadcrumbItem {
  readonly label: string;
  /** Bỏ trống ở mục CUỐI — trang đang đứng thì không tự link về chính nó. */
  readonly to?: string;
}

export interface BreadcrumbProps {
  readonly items: readonly BreadcrumbItem[];
}

/**
 * Đường dẫn trang cho các màn con (hồ sơ creator, tạo booking, chi tiết
 * booking, onboarding).
 *
 * Trước đây mỗi trang con chỉ có một link "← Quay lại": nó nói được bước lùi
 * kế tiếp nhưng không nói mình đang đứng ở đâu trong cây, và không nhảy được
 * về cấp giữa. Breadcrumb trả lời cả hai.
 */
export const Breadcrumb = ({ items }: BreadcrumbProps) => (
  <nav className="breadcrumb" aria-label="Đường dẫn trang">
    {items.map((item, index) => {
      const isLast = index === items.length - 1;
      return (
        <Fragment key={`${item.label}-${index}`}>
          {index > 0 ? (
            <span className="breadcrumb__sep" aria-hidden="true">
              /
            </span>
          ) : null}
          {item.to === undefined || isLast ? (
            <span className="breadcrumb__current" aria-current="page">
              {item.label}
            </span>
          ) : (
            <Link to={item.to} className="breadcrumb__link">
              {item.label}
            </Link>
          )}
        </Fragment>
      );
    })}
  </nav>
);
