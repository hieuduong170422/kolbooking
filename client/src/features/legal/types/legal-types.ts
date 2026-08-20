/**
 * Một mục trong văn bản pháp lý. Tách dữ liệu khỏi cách hiển thị để trang
 * Điều khoản và trang Chính sách dùng chung một bộ khung, và để sửa nội dung
 * không phải đụng vào JSX.
 */
export interface LegalSection {
  readonly heading: string;
  readonly paragraphs?: readonly string[];
  readonly bullets?: readonly string[];
}

export interface LegalDocument {
  readonly title: string;
  readonly summary: string;
  /** Ngày áp dụng, dạng dd/mm/yyyy để đọc thẳng không cần format lại. */
  readonly effectiveDate: string;
  readonly sections: readonly LegalSection[];
}

/**
 * Hộp thư hỗ trợ dùng trong cả hai văn bản.
 *
 * TODO: đổi sang hộp thư thật trước khi mở cho người dùng ngoài — địa chỉ này
 * là chỗ người dùng gửi yêu cầu xoá dữ liệu và khiếu nại, để sai thì các cam
 * kết trong hai văn bản này không thực hiện được.
 */
export const SUPPORT_EMAIL = 'hotro@kolbooking.vn';
