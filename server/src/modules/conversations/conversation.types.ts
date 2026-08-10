/**
 * Một luồng trò chuyện giữa MỘT brand và MỘT creator (OD-09).
 *
 * Cặp (brandUserId, creatorId) là duy nhất: mọi trao đổi — hỏi đáp trước
 * booking lẫn trao đổi trong booking — nằm chung một luồng, nên mở booking
 * ra là thấy cả lịch sử hỏi trước đó, và không phải quản lý nhiều thread rời.
 */
export interface Conversation {
  readonly id: string;
  readonly brandUserId: string;
  readonly creatorId: string;
  /** userId chủ hồ sơ creator — null khi hồ sơ chưa liên kết tài khoản. */
  readonly creatorUserId: string | null;
  readonly createdAt: string;
  readonly lastMessageAt: string | null;
}

export interface CreateConversationInput {
  readonly brandUserId: string;
  readonly creatorId: string;
  readonly creatorUserId: string | null;
}

/** Dòng trong danh sách hội thoại — kèm thông tin hiển thị và số chưa đọc. */
export interface ConversationSummary extends Conversation {
  readonly creatorDisplayName: string;
  readonly creatorAvatarUrl: string | null;
  readonly brandDisplayName: string;
  readonly lastMessagePreview: string | null;
  readonly unreadCount: number;
}
