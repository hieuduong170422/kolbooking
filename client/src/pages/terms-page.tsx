import { LegalDocumentView } from '../features/legal/components/legal-document-view';
import { TERMS_DOCUMENT } from '../features/legal/data/terms-content';

/** /terms — trang bắt buộc: form đăng ký ép tick đồng ý và link tới đây. */
export const TermsPage = () => (
  <section className="page page--reading">
    <LegalDocumentView document={TERMS_DOCUMENT} />
  </section>
);
