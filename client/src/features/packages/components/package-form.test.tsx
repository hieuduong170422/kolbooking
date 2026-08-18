import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { PackageForm } from './package-form';

const fillMinimalForm = (): void => {
  fireEvent.change(screen.getByLabelText('Tên package'), {
    target: { value: 'Video review quán cафе' },
  });
  fireEvent.change(screen.getByLabelText('Category'), { target: { value: 'f&b' } });
  fireEvent.click(screen.getByRole('checkbox', { name: 'tiktok' }));
  fireEvent.change(screen.getByLabelText('Mô tả'), {
    target: { value: 'Một video review 30-60s quay dọc tại quán, đăng kênh creator.' },
  });
  fireEvent.change(screen.getByLabelText('Mô tả deliverable 1'), {
    target: { value: 'Video 30-60s dọc 9:16' },
  });
};

describe('PackageForm (PKG-001..PKG-006)', () => {
  it('nút submit disable khi chưa chọn nền tảng nào', () => {
    render(<PackageForm onSubmit={vi.fn()} onCancel={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Tạo package' })).toBeDisabled();
  });

  it('submit gửi payload đúng shape PackageInput', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<PackageForm onSubmit={onSubmit} onCancel={vi.fn()} />);

    fillMinimalForm();
    fireEvent.click(screen.getByRole('button', { name: 'Tạo package' }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledTimes(1);
    });
    const payload = onSubmit.mock.calls[0]?.[0];
    expect(payload.platforms).toEqual(['tiktok']);
    expect(payload.deliverables).toHaveLength(1);
    expect(payload.deliverables[0].type).toBe('video');
    expect(payload.priceVnd).toBe(500_000);
    expect(payload.usageRights.repost).toBe(true);
    expect(payload.addOns).toEqual([]);
  });

  it('thêm và xóa deliverable động', () => {
    render(<PackageForm onSubmit={vi.fn()} onCancel={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: 'Thêm deliverable' }));
    expect(screen.getByLabelText('Mô tả deliverable 2')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Xóa deliverable 2' }));
    expect(screen.queryByLabelText('Mô tả deliverable 2')).not.toBeInTheDocument();
  });
});
