import { fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import { LinkList } from './link-list';

const Harness = ({ initial = [] as readonly string[] }) => {
  const [links, setLinks] = useState<readonly string[]>(initial);
  return <LinkList links={links} onChange={setLinks} />;
};

const addLink = (value: string): void => {
  fireEvent.change(screen.getByLabelText('Thêm link tham khảo'), { target: { value } });
  fireEvent.click(screen.getByRole('button', { name: 'Thêm link' }));
};

describe('LinkList', () => {
  it('thêm được link hợp lệ và hiển thị trong danh sách', () => {
    render(<Harness />);

    addLink('https://tiktok.com/@abc/video/1');

    expect(screen.getByText('https://tiktok.com/@abc/video/1')).toBeInTheDocument();
  });

  it('chặn giá trị không phải URL, nêu rõ lý do', () => {
    render(<Harness />);

    addLink('tiktok cua toi');

    expect(screen.getByRole('alert')).toHaveTextContent(/http:\/\/ hoặc https:\/\//);
    expect(screen.queryByText('tiktok cua toi')).not.toBeInTheDocument();
  });

  it('chặn giao thức lạ như javascript:', () => {
    render(<Harness />);

    addLink('javascript:alert(1)');

    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('không cho thêm trùng link', () => {
    render(<Harness initial={['https://example.com/a']} />);

    addLink('https://example.com/a');

    expect(screen.getByRole('alert')).toHaveTextContent(/đã có trong danh sách/);
  });

  it('xoá được link khỏi danh sách', () => {
    render(<Harness initial={['https://example.com/a']} />);

    fireEvent.click(screen.getByRole('button', { name: 'Xoá link https://example.com/a' }));

    expect(screen.queryByText('https://example.com/a')).not.toBeInTheDocument();
  });

  it('Enter thêm link chứ không gửi cả form', () => {
    render(<Harness />);
    const input = screen.getByLabelText('Thêm link tham khảo');

    fireEvent.change(input, { target: { value: 'https://example.com/b' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(screen.getByText('https://example.com/b')).toBeInTheDocument();
  });

  it('xoá thông báo lỗi khi người dùng sửa lại ô nhập', () => {
    render(<Harness />);

    addLink('sai');
    expect(screen.getByRole('alert')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Thêm link tham khảo'), {
      target: { value: 'https://example.com/c' },
    });

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
