import type { ReactNode } from 'react';
import { LinkButton } from '../../../shared/components/ui';
import { formatVnd } from '../../../shared/utils/format';
import {
  DELIVERABLE_TYPE_LABELS,
  type PackagePublic,
} from '../types/package-types';

/** Quyền sử dụng tóm tắt một dòng — brand thấy quyền trước khi booking (PKG-004). */
const usageSummary = (pkg: PackagePublic): string => {
  const parts: string[] = [];
  if (pkg.usageRights.repost) parts.push('Được đăng lại');
  if (pkg.usageRights.paidAds) parts.push('Được chạy quảng cáo');
  parts.push(
    pkg.usageRights.durationMonths === null
      ? 'Không giới hạn thời gian'
      : `Dùng trong ${pkg.usageRights.durationMonths} tháng`,
  );
  return parts.join(' · ');
};

/** Card package trên trang public creator detail (PKG-001, SRCH-005). */
export const PackagePublicCard = ({
  pkg,
  action,
}: {
  pkg: PackagePublic;
  /** Slot cuối cột phải — vd nút báo cáo package. */
  action?: ReactNode;
}) => (
  <article className="pkg-card">
    <div className="pkg-card__main">
      <h3 className="pkg-card__name">{pkg.name}</h3>
      <p className="pkg-card__desc">{pkg.description}</p>
      <ul className="pkg-card__deliverables">
        {pkg.deliverables.map((deliverable, index) => (
          <li key={index}>
            {deliverable.quantity}× {DELIVERABLE_TYPE_LABELS[deliverable.type]} —{' '}
            {deliverable.description}
            {deliverable.postedOnCreatorChannel ? '' : ' (bàn giao file cho brand)'}
          </li>
        ))}
      </ul>
      <p className="pkg-card__usage">{usageSummary(pkg)}</p>
    </div>
    <div className="pkg-card__side">
      <p className="pkg-card__price">{formatVnd(pkg.priceVnd)}</p>
      <p className="pkg-card__terms">
        {pkg.turnaroundDays} ngày · {pkg.revisionsIncluded} lần sửa
      </p>
      {pkg.addOns.length > 0 ? (
        <p className="pkg-card__addons">+{pkg.addOns.length} add-on</p>
      ) : null}
      <LinkButton to={`/creators/${pkg.creatorId}/book?package=${pkg.id}`}>Đặt gói này</LinkButton>
      {action}
    </div>
  </article>
);
