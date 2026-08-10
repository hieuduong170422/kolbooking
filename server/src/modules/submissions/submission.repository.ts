import type {
  CreateRevisionInput,
  CreateSubmissionInput,
  RevisionRequest,
  Submission,
} from './submission.types.js';

export interface SubmissionRepository {
  /** Tạo version mới — repository tự tăng version theo booking (DLV-004). */
  create(input: CreateSubmissionInput): Promise<Submission>;
  /** Toàn bộ lịch sử của booking, version cũ trước. */
  listByBooking(bookingId: string): Promise<readonly Submission[]>;
  latest(bookingId: string): Promise<Submission | null>;

  createRevision(input: CreateRevisionInput): Promise<RevisionRequest>;
  listRevisions(bookingId: string): Promise<readonly RevisionRequest[]>;
  /** Số lần brand đã yêu cầu sửa — so với hạn mức trong snapshot (DLV-003). */
  countRevisions(bookingId: string): Promise<number>;
}
