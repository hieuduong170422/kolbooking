import type { AuthRole } from '../../auth/types/auth-types';
import type { Conversation } from '../api/messages-api';

/**
 * Tên ĐỐI PHƯƠNG trong luồng: creator thấy tên brand, brand thấy tên creator.
 * Dùng chung cho trang /messages và hộp chat nổi — hiển thị nhầm phía nào là
 * người dùng thấy chính tên mình ở mọi luồng, không phân biệt được ai với ai.
 */
export const conversationPeerName = (conversation: Conversation, role: AuthRole): string =>
  role === 'creator' ? conversation.brandDisplayName : conversation.creatorDisplayName;

/** Tin gần nhất, kèm chữ thay thế khi luồng còn trống. */
export const conversationPreview = (conversation: Conversation): string =>
  conversation.lastMessagePreview ?? 'Chưa có tin nhắn';

/** Số trên badge — quá 9 thì rút gọn cho khỏi vỡ layout nav và bong bóng. */
export const formatUnreadBadge = (count: number): string => (count > 9 ? '9+' : String(count));

/** Tổng tin chưa đọc của mọi luồng. */
export const totalUnread = (conversations: readonly Conversation[]): number =>
  conversations.reduce((sum, conversation) => sum + conversation.unreadCount, 0);
