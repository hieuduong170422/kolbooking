import { useState, type FormEvent } from 'react';
import { ApiClientError } from '../../../shared/api/api-types';
import { Button, Input, Modal, Textarea } from '../../../shared/components/ui';
import type { Booking } from '../../bookings/types/booking-types';
import type { AuthRole } from '../../auth/types/auth-types';
import { useFulfillment, useFulfillmentActions } from '../hooks/use-submissions';
import type { SubmissionItem } from '../api/submissions-api';

interface FulfillmentPanelProps {
  readonly booking: Booking;
  readonly role: AuthRole;
}

const formatDate = (iso: string): string => new Date(iso).toLocaleString('vi-VN');

/** Trạng thái cho phép creator nộp bài (mirror transition table). */
const CAN_SUBMIT = new Set(['in_progress', 'revision_requested']);

/**
 * Nộp bài và nghiệm thu (DLV-001..DLV-006).
 * Creator thấy form nộp; brand thấy bài đã nộp kèm nút yêu cầu sửa.
 * Cả hai đều thấy lịch sử version và số lượt sửa còn lại.
 */
export const FulfillmentPanel = ({ booking, role }: FulfillmentPanelProps) => {
  const { data, isPending } = useFulfillment(booking.id);
  const { submit, revise } = useFulfillmentActions(booking.id);

  const deliverables = booking.snapshot?.deliverables ?? [];
  const [note, setNote] = useState('');
  const [descriptions, setDescriptions] = useState<readonly string[]>(() =>
    deliverables.map(() => ''),
  );
  const [links, setLinks] = useState<readonly string[]>(() => deliverables.map(() => ''));
  const [proofUrl, setProofUrl] = useState('');
  const [reviseOpen, setReviseOpen] = useState(false);
  const [reason, setReason] = useState('');

  if (booking.snapshot === null) return null;
  if (isPending) return <p className="onb-hint">Đang tải bài nộp...</p>;

  const needsPosting = deliverables.some((item) => item.postedOnCreatorChannel);
  const revisionsLeft = (data?.revisionsIncluded ?? 0) - (data?.revisionsUsed ?? 0);
  const canSubmit = role === 'creator' && CAN_SUBMIT.has(booking.status);
  const canRevise = role === 'brand' && booking.status === 'delivered' && revisionsLeft > 0;

  const patchAt = (
    list: readonly string[],
    index: number,
    value: string,
  ): readonly string[] => list.map((item, i) => (i === index ? value : item));

  const handleSubmit = (event: FormEvent): void => {
    event.preventDefault();
    const items: SubmissionItem[] = deliverables.map((_, index) => ({
      deliverableIndex: index,
      fileUrl: null,
      linkUrl: links[index]?.trim() || null,
      description: descriptions[index]?.trim() ?? '',
    }));
    submit.mutate(
      {
        note: note.trim(),
        items,
        postingProofs: proofUrl.trim() === '' ? [] : [{ platform: 'link', url: proofUrl.trim() }],
      },
      {
        onSuccess: () => {
          setNote('');
          setProofUrl('');
          setDescriptions(deliverables.map(() => ''));
          setLinks(deliverables.map(() => ''));
        },
      },
    );
  };

  const submissions = data?.submissions ?? [];

  return (
    <section className="fulfillment">
      <div className="fulfillment__head">
        <h2>Bàn giao</h2>
        {data !== undefined ? (
          <span className="fulfillment__quota">
            Đã dùng {data.revisionsUsed}/{data.revisionsIncluded} lượt sửa
          </span>
        ) : null}
      </div>

      {submissions.length === 0 ? (
        <p className="onb-empty">Chưa có bài nộp nào.</p>
      ) : (
        <ol className="submission-list">
          {submissions.map((submission) => (
            <li key={submission.id} className="submission">
              <div className="submission__head">
                <span className="submission__version">Bản {submission.version}</span>
                <span className="submission__time">{formatDate(submission.createdAt)}</span>
              </div>
              {submission.note !== '' ? (
                <p className="submission__note">{submission.note}</p>
              ) : null}
              <ul className="submission__items">
                {submission.items.map((item, index) => (
                  <li key={index}>
                    {deliverables[item.deliverableIndex]?.description ??
                      `Deliverable ${item.deliverableIndex + 1}`}
                    {': '}
                    {item.linkUrl !== null ? (
                      <a href={item.linkUrl} target="_blank" rel="noopener noreferrer">
                        xem bài
                      </a>
                    ) : (
                      <span>{item.description}</span>
                    )}
                  </li>
                ))}
              </ul>
              {submission.postingProofs.length > 0 ? (
                <p className="submission__proof">
                  Bằng chứng đăng:{' '}
                  {submission.postingProofs.map((proof) => (
                    <a key={proof.url} href={proof.url} target="_blank" rel="noopener noreferrer">
                      {proof.url}
                    </a>
                  ))}
                </p>
              ) : null}
            </li>
          ))}
        </ol>
      )}

      {(data?.revisions.length ?? 0) > 0 ? (
        <ul className="revision-list">
          {data?.revisions.map((revision) => (
            <li key={revision.id}>
              <strong>Yêu cầu sửa bản {revision.submissionVersion}:</strong> {revision.reason}
            </li>
          ))}
        </ul>
      ) : null}

      {submit.error instanceof ApiClientError ? (
        <div className="notice notice--warning" role="alert">
          <p>{submit.error.message}</p>
        </div>
      ) : null}
      {revise.error instanceof ApiClientError ? (
        <div className="notice notice--warning" role="alert">
          <p>{revise.error.message}</p>
        </div>
      ) : null}

      {canSubmit ? (
        <form className="submit-form" onSubmit={handleSubmit}>
          <h3>{submissions.length === 0 ? 'Nộp bài' : 'Nộp lại sau khi sửa'}</h3>
          {deliverables.map((deliverable, index) => (
            <div key={index} className="field-grid">
              <Input
                label={`${deliverable.quantity}× ${deliverable.description}`}
                span="half"
                type="url"
                value={links[index] ?? ''}
                onChange={(event) => setLinks(patchAt(links, index, event.target.value))}
                placeholder="Link file hoặc bài đăng"
                required
              />
              <Input
                label="Ghi chú cho mục này"
                span="half"
                value={descriptions[index] ?? ''}
                onChange={(event) =>
                  setDescriptions(patchAt(descriptions, index, event.target.value))
                }
                minLength={3}
                placeholder="VD: Video 45 giây quay dọc"
                required
              />
            </div>
          ))}

          {needsPosting ? (
            <Input
              label="Link bài đăng công khai (bắt buộc với gói đăng kênh creator)"
              type="url"
              value={proofUrl}
              onChange={(event) => setProofUrl(event.target.value)}
              placeholder="https://www.tiktok.com/@ban/video/..."
              required
            />
          ) : null}

          <Textarea
            label="Ghi chú chung (tùy chọn)"
            value={note}
            onChange={(event) => setNote(event.target.value)}
            rows={2}
          />

          <Button type="submit" variant="primary" loading={submit.isPending}>
            {submit.isPending ? 'Đang nộp...' : 'Nộp bài'}
          </Button>
        </form>
      ) : null}

      {role === 'brand' && booking.status === 'delivered' ? (
        <div className="fulfillment__review">
          {canRevise ? (
            <Button
              onClick={() => {
                setReviseOpen(true);
                setReason('');
              }}
            >
              Yêu cầu sửa ({revisionsLeft} lượt còn lại)
            </Button>
          ) : (
            <p className="onb-hint">
              Đã dùng hết lượt sửa trong gói. Muốn sửa tiếp cần thỏa thuận thêm với creator.
            </p>
          )}
        </div>
      ) : null}

      {reviseOpen ? (
        <Modal
          title="Yêu cầu sửa"
          description="Nêu cụ thể chỗ cần sửa — yêu cầu ngoài brief đã chốt cần thỏa thuận riêng (DLV-008)."
          onClose={() => setReviseOpen(false)}
          footer={
            <>
              <Button variant="ghost" onClick={() => setReviseOpen(false)}>
                Hủy
              </Button>
              <Button
                variant="primary"
                loading={revise.isPending}
                disabled={reason.trim().length < 10}
                onClick={() =>
                  revise.mutate(reason.trim(), { onSuccess: () => setReviseOpen(false) })
                }
              >
                {revise.isPending ? 'Đang gửi...' : 'Gửi yêu cầu sửa'}
              </Button>
            </>
          }
        >
          <Textarea
            label="Nội dung cần sửa"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            rows={4}
            minLength={10}
          />
        </Modal>
      ) : null}
    </section>
  );
};
