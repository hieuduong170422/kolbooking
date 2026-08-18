import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';
import type { Creator } from '../types/creator-types';
import { CreatorCard } from './creator-card';

const sampleCreator: Creator = {
  id: 'crt_0001',
  displayName: 'Lan Chi Foodie',
  avatarUrl: null,
  bio: 'Food reviewer Hà Nội.',
  city: 'Hà Nội',
  niches: ['f&b', 'cafe'],
  language: 'vi',
  creatorType: 'koc',
  socialAccounts: [
    {
      platform: 'tiktok',
      handle: '@lanchifoodie',
      url: 'https://www.tiktok.com/@lanchifoodie',
      followerCount: 48_000,
      isVerified: true,
    },
  ],
  audienceMetrics: null,
  serviceMode: 'both',
  portfolioItems: [],
  priceFromVnd: 1_500_000,
  rating: 4.8,
  completedBookings: 32,
};

const renderCard = (creator: Creator) =>
  render(
    <MemoryRouter>
      <CreatorCard creator={creator} />
    </MemoryRouter>,
  );

describe('CreatorCard', () => {
  it('hiển thị tên, loại creator và thông tin chính', () => {
    renderCard(sampleCreator);

    expect(screen.getByRole('heading', { name: 'Lan Chi Foodie' })).toBeInTheDocument();
    expect(screen.getByText('KOC')).toBeInTheDocument();
    // Sao là icon SVG nên chuỗi bị cắt khúc — so cả dòng meta sau khi gộp.
    expect(screen.getByText(/32 booking/, { selector: 'p' })).toHaveTextContent(
      'Hà Nội · 4.8 · 32 booking',
    );
    expect(screen.getByText(/48K/)).toBeInTheDocument();
  });

  it('hiển thị giá định dạng VND', () => {
    renderCard(sampleCreator);
    expect(screen.getByText(/1\.500\.000/)).toBeInTheDocument();
  });

  it('liên kết tới trang chi tiết creator', () => {
    renderCard(sampleCreator);
    expect(screen.getByRole('link')).toHaveAttribute('href', '/creators/crt_0001');
  });
});
