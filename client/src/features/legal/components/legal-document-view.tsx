import { useAppConfig } from '../../config/hooks/use-app-config';
import type { LegalDocument } from '../types/legal-types';

export interface LegalDocumentViewProps {
  readonly document: LegalDocument;
}

/**
 * Khung hiển thị chung cho Điều khoản và Chính sách.
 *
 * Phiên bản lấy từ server (TERMS_VERSION) chứ không chép vào nội dung: đó
 * đúng là chuỗi được lưu vào hồ sơ consent của người dùng lúc đăng ký, nên
 * hai chỗ phải luôn khớp nhau.
 */
export const LegalDocumentView = ({ document }: LegalDocumentViewProps) => {
  const { termsVersion } = useAppConfig();

  return (
    <article className="legal">
      <header className="legal__header">
        <h1>{document.title}</h1>
        <p className="legal__meta">
          Phiên bản {termsVersion} · Áp dụng từ {document.effectiveDate}
        </p>
        <p className="legal__summary">{document.summary}</p>
      </header>

      {document.sections.map((section) => (
        <section key={section.heading} className="legal__section">
          <h2>{section.heading}</h2>
          {section.paragraphs?.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
          {section.bullets === undefined ? null : (
            <ul className="legal__list">
              {section.bullets.map((bullet) => (
                <li key={bullet}>{bullet}</li>
              ))}
            </ul>
          )}
        </section>
      ))}
    </article>
  );
};
