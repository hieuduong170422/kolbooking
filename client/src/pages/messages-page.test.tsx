import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuth } from '../features/auth/store/use-auth';
import { useConversations } from '../features/messages/hooks/use-messages';
import type { Conversation } from '../features/messages/api/messages-api';
import type { AuthRole, AuthUser } from '../features/auth/types/auth-types';
import { MessagesPage } from './messages-page';

vi.mock('../features/auth/store/use-auth', () => ({ useAuth: vi.fn() }));
vi.mock('../features/messages/hooks/use-messages', () => ({ useConversations: vi.fn() }));
// Khung chat là component dữ liệu riêng (cần QueryClient) — test trang không bao nó.
vi.mock('../features/messages/components/chat-thread', () => ({
  ChatThread: () => <div data-testid="chat-thread" />,
}));

const mockUseAuth = vi.mocked(useAuth);
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
  unreadCount: 2,
  ...overrides,
});

const setup = (role: AuthRole, conversations: readonly Conversation[]): void => {
  mockUseAuth.mockReturnValue({
    status: 'authenticated',
    user: { id: 'usr_1', role, displayName: 'Người dùng' } as AuthUser,
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
    updateUser: vi.fn(),
  } as never);
  mockUseConversations.mockReturnValue({
    data: conversations,
    isPending: false,
    isError: false,
    refetch: vi.fn(),
  } as never);

  render(
    <MemoryRouter initialEntries={['/messages']}>
      <MessagesPage />
    </MemoryRouter>,
  );
};

describe('MessagesPage (OD-09)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Tên đối phương hiện ở CẢ danh sách lẫn header khung chat — query trong
  // danh sách (role complementary) để không khớp trùng.
  const list = () => within(screen.getByRole('complementary'));

  it('brand thấy tên creator, tin gần nhất và số chưa đọc', () => {
    setup('brand', [makeConversation()]);

    expect(list().getByText('Lan Chi Foodie')).toBeInTheDocument();
    expect(list().getByText(/còn nhận lịch tuần này/)).toBeInTheDocument();
    expect(list().getByText('2')).toBeInTheDocument();
  });

  it('creator thấy tên brand thay vì tên chính mình', () => {
    setup('creator', [makeConversation()]);

    expect(list().getByText('The Morning Cafe')).toBeInTheDocument();
    expect(screen.queryByText('Lan Chi Foodie')).not.toBeInTheDocument();
  });

  it('brand có lối đặt booking ngay trong khung chat', () => {
    setup('brand', [makeConversation()]);
    expect(screen.getByRole('link', { name: 'Đặt booking' })).toHaveAttribute(
      'href',
      '/creators/crt_0001/book',
    );
  });

  it('creator KHÔNG thấy nút đặt booking (chỉ brand đặt)', () => {
    setup('creator', [makeConversation()]);
    expect(screen.queryByRole('link', { name: 'Đặt booking' })).not.toBeInTheDocument();
  });

  it('chọn hội thoại khác thì luồng đó thành luồng đang mở', () => {
    setup('brand', [
      makeConversation(),
      makeConversation({ id: 'cnv_2', creatorDisplayName: 'Minh Thu UGC' }),
    ]);

    fireEvent.click(list().getByText('Minh Thu UGC'));

    // Mục được chọn mang class active; header khung chat đổi theo.
    const active = screen.getByRole('complementary').querySelector('.conversation-item--active');
    expect(active?.textContent).toContain('Minh Thu UGC');
  });

  it('chưa có hội thoại nào → hướng brand đi tìm creator', () => {
    setup('brand', []);

    expect(screen.getByText('Chưa có cuộc trò chuyện nào')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Khám phá creator' })).toBeInTheDocument();
  });
});
