import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthContext, type AuthContextValue } from '../../auth/store/auth-context';
import type { AuthRole, AuthUser } from '../../auth/types/auth-types';
import type { Conversation } from '../api/messages-api';
import { useConversations } from '../hooks/use-messages';
import { ChatWidget } from './chat-widget';

vi.mock('../hooks/use-messages', () => ({ useConversations: vi.fn() }));
// Khung chat là component dữ liệu (cần QueryClient) — test widget không bao nó.
vi.mock('./chat-thread', () => ({
  ChatThread: ({ conversationId }: { conversationId: string }) => (
    <div data-testid="chat-thread">{conversationId}</div>
  ),
}));

const mockUseConversations = vi.mocked(useConversations);

const makeConversation = (overrides: Partial<Conversation> = {}): Conversation => ({
  id: 'cnv_1',
  brandUserId: 'usr_brand',
  creatorId: 'crt_0001',
  creatorUserId: 'usr_creator',
  createdAt: '2026-08-10T09:00:00.000Z',
  lastMessageAt: '2026-08-10T10:00:00.000Z',
  creatorDisplayName: 'Lan Chi Foodie',
  creatorAvatarUrl: null,
  brandDisplayName: 'The Morning Cafe',
  lastMessagePreview: 'Bạn còn nhận lịch tuần này không?',
  unreadCount: 0,
  ...overrides,
});

const refetch = vi.fn();

const renderWidget = (options: {
  readonly role?: AuthRole | null;
  readonly conversations?: readonly Conversation[];
  readonly path?: string;
  readonly isPending?: boolean;
  readonly isError?: boolean;
}): void => {
  const {
    role = 'brand',
    conversations = [],
    path = '/creators',
    isPending = false,
    isError = false,
  } = options;

  mockUseConversations.mockReturnValue({
    data: isPending || isError ? undefined : conversations,
    isPending,
    isError,
    refetch,
  } as never);

  const auth: AuthContextValue | null =
    role === null
      ? null
      : ({
          status: 'authenticated',
          user: { id: 'usr_1', role, displayName: 'Người dùng' } as AuthUser,
        } as AuthContextValue);

  const wrap = (children: ReactNode): ReactNode =>
    auth === null ? children : <AuthContext.Provider value={auth}>{children}</AuthContext.Provider>;

  render(<MemoryRouter initialEntries={[path]}>{wrap(<ChatWidget />)}</MemoryRouter>);
};

describe('ChatWidget', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('mặc định thu nhỏ: chỉ có bong bóng, chưa mở hộp chat', () => {
    renderWidget({ conversations: [makeConversation()] });

    expect(screen.getByRole('button', { name: 'Mở tin nhắn' })).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('bong bóng hiện số tin chưa đọc gộp mọi luồng', () => {
    renderWidget({
      conversations: [
        makeConversation({ unreadCount: 2 }),
        makeConversation({ id: 'cnv_2', unreadCount: 3 }),
      ],
    });

    expect(screen.getByRole('button', { name: 'Mở tin nhắn (5 chưa đọc)' })).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it('quá 9 tin chưa đọc thì rút gọn thành 9+ cho khỏi vỡ bong bóng', () => {
    renderWidget({ conversations: [makeConversation({ unreadCount: 12 })] });

    expect(screen.getByText('9+')).toBeInTheDocument();
  });

  it('bấm bong bóng → mở hộp chat kèm danh sách hội thoại', () => {
    renderWidget({ conversations: [makeConversation()] });

    fireEvent.click(screen.getByRole('button', { name: 'Mở tin nhắn' }));

    expect(screen.getByRole('dialog', { name: 'Hộp tin nhắn' })).toBeInTheDocument();
    expect(screen.getByText('Lan Chi Foodie')).toBeInTheDocument();
    expect(screen.queryByTestId('chat-thread')).not.toBeInTheDocument();
  });

  it('chọn một hội thoại → hiện khung chat của đúng luồng đó', () => {
    renderWidget({
      conversations: [
        makeConversation(),
        makeConversation({ id: 'cnv_2', creatorDisplayName: 'Minh Thu UGC' }),
      ],
    });

    fireEvent.click(screen.getByRole('button', { name: 'Mở tin nhắn' }));
    fireEvent.click(screen.getByText('Minh Thu UGC'));

    expect(screen.getByTestId('chat-thread')).toHaveTextContent('cnv_2');
  });

  it('từ khung chat bấm quay lại → về danh sách', () => {
    renderWidget({ conversations: [makeConversation()] });

    fireEvent.click(screen.getByRole('button', { name: 'Mở tin nhắn' }));
    fireEvent.click(screen.getByText('Lan Chi Foodie'));
    expect(screen.getByTestId('chat-thread')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Quay lại danh sách' }));

    expect(screen.queryByTestId('chat-thread')).not.toBeInTheDocument();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('bấm thu nhỏ → hộp chat đóng, còn lại bong bóng', () => {
    renderWidget({ conversations: [makeConversation()] });

    fireEvent.click(screen.getByRole('button', { name: 'Mở tin nhắn' }));
    fireEvent.click(screen.getByRole('button', { name: 'Thu nhỏ hộp tin nhắn' }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Mở tin nhắn' })).toBeInTheDocument();
  });

  it('creator thấy tên BRAND chứ không phải tên chính mình', () => {
    renderWidget({ role: 'creator', conversations: [makeConversation()] });

    fireEvent.click(screen.getByRole('button', { name: 'Mở tin nhắn' }));

    expect(screen.getByText('The Morning Cafe')).toBeInTheDocument();
    expect(screen.queryByText('Lan Chi Foodie')).not.toBeInTheDocument();
  });

  it('creator mở luồng thì tiêu đề cũng là tên brand', () => {
    renderWidget({ role: 'creator', conversations: [makeConversation()] });

    fireEvent.click(screen.getByRole('button', { name: 'Mở tin nhắn' }));
    fireEvent.click(screen.getByText('The Morning Cafe'));

    expect(screen.getByRole('dialog').textContent).toContain('The Morning Cafe');
    expect(screen.getByRole('dialog').textContent).not.toContain('Lan Chi Foodie');
  });

  it('chưa có hội thoại nào → chỉ dẫn brand cách bắt đầu', () => {
    renderWidget({ conversations: [] });

    fireEvent.click(screen.getByRole('button', { name: 'Mở tin nhắn' }));

    expect(screen.getByText(/Chưa có cuộc trò chuyện nào/)).toBeInTheDocument();
  });

  it('creator không bị bảo đi mở hồ sơ creator (họ không mở luồng được)', () => {
    renderWidget({ role: 'creator', conversations: [] });

    fireEvent.click(screen.getByRole('button', { name: 'Mở tin nhắn' }));

    expect(screen.getByText(/Khi brand nhắn tin/)).toBeInTheDocument();
  });

  it('đang tải → báo đang tải, KHÔNG báo nhầm là chưa có hội thoại', () => {
    renderWidget({ isPending: true });

    fireEvent.click(screen.getByRole('button', { name: 'Mở tin nhắn' }));

    expect(screen.getByText(/Đang tải cuộc trò chuyện/)).toBeInTheDocument();
    expect(screen.queryByText(/Chưa có cuộc trò chuyện nào/)).not.toBeInTheDocument();
  });

  it('lỗi mạng → báo lỗi kèm nút thử lại, KHÔNG nói là chưa có hội thoại', () => {
    renderWidget({ isError: true });

    fireEvent.click(screen.getByRole('button', { name: 'Mở tin nhắn' }));

    expect(screen.getByText(/Không tải được danh sách/)).toBeInTheDocument();
    expect(screen.queryByText(/Chưa có cuộc trò chuyện nào/)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Thử lại' }));
    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it('bấm Escape trong hộp chat → thu nhỏ lại', () => {
    renderWidget({ conversations: [makeConversation()] });

    fireEvent.click(screen.getByRole('button', { name: 'Mở tin nhắn' }));
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('mở hộp chat thì tiêu điểm bàn phím vào panel, đóng thì trả về bong bóng', () => {
    renderWidget({ conversations: [makeConversation()] });

    fireEvent.click(screen.getByRole('button', { name: 'Mở tin nhắn' }));
    expect(screen.getByRole('dialog')).toHaveFocus();

    fireEvent.click(screen.getByRole('button', { name: 'Thu nhỏ hộp tin nhắn' }));
    expect(screen.getByRole('button', { name: 'Mở tin nhắn' })).toHaveFocus();
  });

  it('ẩn trên trang /messages vì ở đó đã có khung chat đầy đủ', () => {
    renderWidget({ conversations: [makeConversation()], path: '/messages' });

    expect(screen.queryByRole('button', { name: 'Mở tin nhắn' })).not.toBeInTheDocument();
  });

  it('admin không có hộp chat (không tham gia hội thoại brand↔creator)', () => {
    renderWidget({ role: 'admin', conversations: [makeConversation()] });

    expect(screen.queryByRole('button', { name: 'Mở tin nhắn' })).not.toBeInTheDocument();
  });

  it('khách chưa đăng nhập không thấy hộp chat và KHÔNG gọi API hội thoại', () => {
    renderWidget({ role: null });

    expect(screen.queryByRole('button', { name: 'Mở tin nhắn' })).not.toBeInTheDocument();
    expect(mockUseConversations).not.toHaveBeenCalled();
  });
});
