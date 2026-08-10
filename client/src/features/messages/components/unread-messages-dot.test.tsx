import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthContext, type AuthContextValue } from '../../auth/store/auth-context';
import type { AuthRole, AuthUser } from '../../auth/types/auth-types';
import type { Conversation } from '../api/messages-api';
import { useConversations } from '../hooks/use-messages';
import { UnreadMessagesDot } from './unread-messages-dot';

vi.mock('../hooks/use-messages', () => ({ useConversations: vi.fn() }));

const mockUseConversations = vi.mocked(useConversations);

const conversationWith = (unreadCount: number, id = 'cnv_1'): Conversation =>
  ({ id, unreadCount }) as Conversation;

const renderDot = (options: {
  readonly role?: AuthRole | null;
  readonly conversations?: readonly Conversation[];
}): void => {
  const { role = 'brand', conversations = [] } = options;

  mockUseConversations.mockReturnValue({ data: conversations } as never);

  const auth =
    role === null
      ? null
      : ({
          status: 'authenticated',
          user: { id: 'usr_1', role } as AuthUser,
        } as AuthContextValue);

  const tree: ReactNode =
    auth === null ? (
      <UnreadMessagesDot />
    ) : (
      <AuthContext.Provider value={auth}>
        <UnreadMessagesDot />
      </AuthContext.Provider>
    );

  render(tree);
};

describe('UnreadMessagesDot', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('cộng dồn số chưa đọc của mọi luồng', () => {
    renderDot({ conversations: [conversationWith(2), conversationWith(3, 'cnv_2')] });

    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it('không còn tin chưa đọc → không hiện chấm nào', () => {
    renderDot({ conversations: [conversationWith(0)] });

    expect(screen.queryByText('0')).not.toBeInTheDocument();
    expect(document.querySelector('.nav-dot')).toBeNull();
  });

  it('trên 9 tin thì hiện 9+ để nav không bị giãn', () => {
    renderDot({ conversations: [conversationWith(15)] });

    expect(screen.getByText('9+')).toBeInTheDocument();
  });

  // Chữ ẩn thay cho aria-label: ARIA không cho đặt tên trên <span> trơn nên
  // trình đọc màn hình sẽ chỉ nghe "Tin nhắn 4" — không rõ 4 cái gì.
  it('có chữ ẩn cho trình đọc màn hình, đặt trong vùng role="status"', () => {
    renderDot({ conversations: [conversationWith(4)] });

    const hidden = screen.getByText('4 tin nhắn chưa đọc');
    expect(hidden).toHaveClass('visually-hidden');
    expect(hidden.closest('[role="status"]')).not.toBeNull();
  });

  it('số hiển thị được ẩn khỏi trình đọc để không đọc lặp', () => {
    renderDot({ conversations: [conversationWith(4)] });

    expect(screen.getByText('4')).toHaveAttribute('aria-hidden', 'true');
  });

  it('chưa đăng nhập → không render và không gọi API hội thoại', () => {
    renderDot({ role: null });

    expect(document.querySelector('.nav-dot')).toBeNull();
    expect(mockUseConversations).not.toHaveBeenCalled();
  });
});
