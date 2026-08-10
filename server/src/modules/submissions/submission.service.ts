import { ApiError } from '../../shared/errors/api-error.js';
import { assertBookingAccess, type BookingParticipant } from '../bookings/booking.access.js';
import type { BookingRepository } from '../bookings/booking.repository.js';
import type { BookingService } from '../bookings/booking.service.js';
import type { Booking } from '../bookings/booking.types.js';
import type { SubmissionRepository } from './submission.repository.js';
import type {
  PostingProof,
  RevisionRequest,
  Submission,
  SubmissionItem,
} from './submission.types.js';

export interface SubmitInput {
  readonly note: string;
  readonly items: readonly SubmissionItem[];
  readonly postingProofs: readonly PostingProof[];
}

export interface FulfillmentState {
  readonly submissions: readonly Submission[];
  readonly revisions: readonly RevisionRequest[];
  /** Số lần sửa đã dùng / tổng được mua — hiện thẳng cho cả hai bên (DLV-003). */
  readonly revisionsUsed: number;
  readonly revisionsIncluded: number;
}

/**
 * Nộp bài, yêu cầu sửa và nghiệm thu (DLV-001..DLV-006).
 *
 * Trạng thái booking luôn đổi qua BookingService.transition để bảng
 * transition vẫn là nguồn sự thật duy nhất; service này chỉ thêm các luật
 * riêng của fulfillment (nộp đủ deliverable, hạn mức revision).
 */
export class SubmissionService {
  private readonly submissions: SubmissionRepository;
  private readonly bookings: BookingRepository;
  private readonly bookingService: BookingService;

  constructor(
    submissions: SubmissionRepository,
    bookings: BookingRepository,
    bookingService: BookingService,
  ) {
    this.submissions = submissions;
    this.bookings = bookings;
    this.bookingService = bookingService;
  }

  async getState(actor: BookingParticipant, bookingId: string): Promise<FulfillmentState> {
    const booking = await this.requireBooking(bookingId, actor);
    const [submissions, revisions] = await Promise.all([
      this.submissions.listByBooking(bookingId),
      this.submissions.listRevisions(bookingId),
    ]);
    return {
      submissions,
      revisions,
      revisionsUsed: revisions.length,
      revisionsIncluded: booking.snapshot?.revisionsIncluded ?? 0,
    };
  }

  /** Creator nộp bài — phải map đủ deliverable đã chốt (DLV-001). */
  async submit(
    actor: BookingParticipant,
    bookingId: string,
    input: SubmitInput,
  ): Promise<Submission> {
    const booking = await this.requireBooking(bookingId, actor);
    this.assertDeliverablesCovered(booking, input.items);
    this.assertPostingProofs(booking, input.postingProofs);

    const submission = await this.submissions.create({
      bookingId,
      note: input.note,
      items: input.items,
      postingProofs: input.postingProofs,
      submittedByUserId: actor.userId,
    });

    // Transition sau khi lưu: nếu transition hỏng, không có bài nộp mồ côi
    // ở trạng thái đã chuyển.
    await this.bookingService.transition(
      { userId: actor.userId, role: actor.role, creatorId: actor.creatorId },
      bookingId,
      'submit',
    );
    return submission;
  }

  /** Brand yêu cầu sửa — chặn khi đã hết lượt đã mua (DLV-003). */
  async requestRevision(
    actor: BookingParticipant,
    bookingId: string,
    reason: string,
  ): Promise<RevisionRequest> {
    const booking = await this.requireBooking(bookingId, actor);
    const included = booking.snapshot?.revisionsIncluded ?? 0;
    const used = await this.submissions.countRevisions(bookingId);

    if (used >= included) {
      throw ApiError.conflict(
        `Đã dùng hết ${included} lượt sửa trong gói. Cần thỏa thuận thêm (add-on) để sửa tiếp.`,
      );
    }

    const latest = await this.submissions.latest(bookingId);
    const revision = await this.submissions.createRevision({
      bookingId,
      submissionVersion: latest?.version ?? 0,
      reason: reason.trim(),
      requestedByUserId: actor.userId,
    });

    await this.bookingService.transition(
      { userId: actor.userId, role: actor.role, creatorId: actor.creatorId },
      bookingId,
      'request_revision',
      reason,
    );
    return revision;
  }

  private async requireBooking(
    bookingId: string,
    actor: BookingParticipant,
  ): Promise<Booking> {
    const booking = await this.bookings.findById(bookingId);
    if (!booking) {
      throw ApiError.notFound('Không tìm thấy booking này.');
    }
    assertBookingAccess(booking, actor);
    return booking;
  }

  /** Không cho nộp thiếu deliverable bắt buộc (DLV-001). */
  private assertDeliverablesCovered(
    booking: Booking,
    items: readonly SubmissionItem[],
  ): void {
    const deliverables = booking.snapshot?.deliverables ?? [];
    if (deliverables.length === 0) {
      throw ApiError.conflict('Booking chưa có điều khoản đã khóa, không thể nộp bài.');
    }

    const covered = new Set(items.map((item) => item.deliverableIndex));
    const missing = deliverables
      .map((_, index) => index)
      .filter((index) => !covered.has(index));
    if (missing.length > 0) {
      throw ApiError.badRequest(
        `Còn thiếu ${missing.length} deliverable chưa nộp (vị trí ${missing.join(', ')}).`,
      );
    }
    if (items.some((item) => item.deliverableIndex >= deliverables.length)) {
      throw ApiError.badRequest('Có deliverable không thuộc gói đã chốt.');
    }
  }

  /**
   * Deliverable phải đăng trên kênh creator thì bắt buộc có link bài đăng
   * làm bằng chứng (DLV-006).
   */
  private assertPostingProofs(booking: Booking, proofs: readonly PostingProof[]): void {
    const needsPosting = (booking.snapshot?.deliverables ?? []).some(
      (deliverable) => deliverable.postedOnCreatorChannel,
    );
    if (needsPosting && proofs.length === 0) {
      throw ApiError.badRequest(
        'Gói yêu cầu đăng trên kênh creator — cần ít nhất một link bài đăng làm bằng chứng.',
      );
    }
  }
}
