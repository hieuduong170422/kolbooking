import { LegalDocumentView } from '../features/legal/components/legal-document-view';
import { PRIVACY_DOCUMENT } from '../features/legal/data/privacy-content';

/** /privacy — trang bắt buộc: form đăng ký ép tick đồng ý và link tới đây. */
export const PrivacyPage = () => (
  <section className="page page--reading">
    <LegalDocumentView document={PRIVACY_DOCUMENT} />
  </section>
);
