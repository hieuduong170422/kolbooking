import type { PaginationMeta } from '../../api/api-types';
import { Button } from '../ui';

interface PaginationProps {
  readonly meta: PaginationMeta;
  readonly onPageChange: (page: number) => void;
}

export const Pagination = ({ meta, onPageChange }: PaginationProps) => {
  if (meta.totalPages <= 1) return null;

  return (
    <nav className="pagination" aria-label="Phân trang">
      <Button disabled={meta.page <= 1} onClick={() => onPageChange(meta.page - 1)}>
        Trang trước
      </Button>
      <span className="pagination__info">
        Trang {meta.page} / {meta.totalPages}
      </span>
      <Button disabled={meta.page >= meta.totalPages} onClick={() => onPageChange(meta.page + 1)}>
        Trang sau
      </Button>
    </nav>
  );
};
