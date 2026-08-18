import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Dropdown } from './dropdown';

const renderMenu = (onSelect = vi.fn()) => {
  render(
    <Dropdown
      trigger="Minh Hiếu"
      triggerClassName="app-header__user"
      items={[{ key: 'logout', label: 'Đăng xuất', onSelect, tone: 'danger' }]}
    />,
  );
  return onSelect;
};

describe('Dropdown', () => {
  it('menu đóng lúc đầu và aria-expanded=false', () => {
    renderMenu();

    expect(screen.getByRole('button', { name: 'Minh Hiếu' })).toHaveAttribute(
      'aria-expanded',
      'false',
    );
    expect(screen.queryByRole('menu')).toBeNull();
  });

  it('mở menu khi bấm nút', () => {
    renderMenu();

    fireEvent.click(screen.getByRole('button', { name: 'Minh Hiếu' }));

    expect(screen.getByRole('menu')).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'Đăng xuất' })).toBeInTheDocument();
  });

  it('chạy hành động rồi đóng menu khi chọn mục', () => {
    const onSelect = renderMenu();

    fireEvent.click(screen.getByRole('button', { name: 'Minh Hiếu' }));
    fireEvent.click(screen.getByRole('menuitem', { name: 'Đăng xuất' }));

    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('menu')).toBeNull();
  });

  it('đóng khi nhấn Escape', () => {
    renderMenu();

    fireEvent.click(screen.getByRole('button', { name: 'Minh Hiếu' }));
    fireEvent.keyDown(document, { key: 'Escape' });

    expect(screen.queryByRole('menu')).toBeNull();
  });

  it('đóng khi bấm ra ngoài', () => {
    renderMenu();

    fireEvent.click(screen.getByRole('button', { name: 'Minh Hiếu' }));
    fireEvent.mouseDown(document.body);

    expect(screen.queryByRole('menu')).toBeNull();
  });
});
