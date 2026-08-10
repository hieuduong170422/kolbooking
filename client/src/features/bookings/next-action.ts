import type { AuthRole } from '../auth/types/auth-types';
import type { Booking, BookingAction, BookingStatus } from './types/booking-types';

/** Ai được làm gì ở trạng thái nào — mirror transition table phía server. */
const ACTIONS_BY_STATUS: Partial<Record<BookingStatus, Partial<Record<AuthRole, readonly BookingAction[]>>>> = {
  draft: { brand: ['send', 'cancel'] },
  pending_creator: { creator: ['accept', 'propose_change', 'reject'], brand: ['cancel'] },
  awaiting_payment: { admin: ['confirm_payment'], brand: ['cancel'] },
  confirmed: { creator: ['start_work'] },
  // submit và request_revision cần dữ liệu kèm theo nên do FulfillmentPanel lo,
  // không phải nút transition trơn.
  delivered: { brand: ['approve'] },
  approved: { admin: ['complete'] },
};

/** Các action người dùng hiện tại thực hiện được — server vẫn là chốt chặn cuối. */
export const availableActions = (
  booking: Booking,
  role: AuthRole,
): readonly BookingAction[] => ACTIONS_BY_STATUS[booking.status]?.[role] ?? [];

/**
 * Câu trả lời cho "giờ đến lượt ai, làm gì" (BKG-008) — hiển thị ở đầu
 * mỗi màn booking để không ai phải đoán bước tiếp theo.
 */
export const nextActionHint = (booking: Booking, role: AuthRole): string => {
  switch (booking.status) {
    case 'draft':
      return role === 'brand'
        ? 'Xem lại brief rồi gửi yêu cầu cho creator.'
        : 'Brand đang soạn brief.';
    case 'pending_creator':
      return role === 'creator'
        ? 'Bạn cần phản hồi: chấp nhận, đề nghị thay đổi hoặc từ chối.'
        : 'Đang chờ creator phản hồi.';
    case 'awaiting_payment':
      return role === 'brand'
        ? 'Chuyển khoản theo hướng dẫn; đội vận hành xác nhận là booking bắt đầu.'
        : role === 'admin'
          ? 'Đối chiếu giao dịch rồi xác nhận thanh toán.'
          : 'Đang chờ brand thanh toán.';
    case 'confirmed':
      return role === 'creator'
        ? 'Tiền đã được bảo đảm — bấm bắt đầu khi vào việc.'
        : 'Creator sắp bắt đầu sản xuất.';
    case 'in_progress':
      return role === 'creator'
        ? 'Đang sản xuất — nộp bài ở mục Bàn giao bên dưới khi xong.'
        : 'Creator đang sản xuất nội dung.';
    case 'delivered':
      return role === 'brand'
        ? 'Xem bài nộp rồi nghiệm thu, hoặc yêu cầu sửa trong số lượt đã mua.'
        : 'Đã nộp bài, đang chờ brand xem.';
    case 'revision_requested':
      return role === 'creator'
        ? 'Brand yêu cầu sửa — chỉnh rồi nộp lại ở mục Bàn giao.'
        : 'Đang chờ creator nộp lại bản sửa.';
    case 'approved':
      return role === 'admin'
        ? 'Nội dung đã được nghiệm thu — chốt hoàn tất để đủ điều kiện giải ngân.'
        : 'Đã nghiệm thu, chờ đội vận hành chốt hoàn tất.';
    case 'completed':
      return 'Booking đã hoàn tất.';
    case 'cancelled':
      return 'Booking đã hủy.';
    case 'expired':
      return 'Yêu cầu đã hết hạn. Bạn có thể tạo booking mới.';
    default:
      return 'Không có việc cần làm ở bước này.';
  }
};
