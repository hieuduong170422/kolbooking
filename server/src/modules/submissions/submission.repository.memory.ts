import { randomUUID } from 'node:crypto';
import type { SubmissionRepository } from './submission.repository.js';
import type {
  CreateRevisionInput,
  CreateSubmissionInput,
  RevisionRequest,
  Submission,
} from './submission.types.js';

/** In-memory implementation — bản ghi immutable, không bao giờ ghi đè version cũ. */
export class InMemorySubmissionRepository implements SubmissionRepository {
  private readonly submissions: Submission[] = [];
  private readonly revisions: RevisionRequest[] = [];

  create(input: CreateSubmissionInput): Promise<Submission> {
    const existing = this.submissions.filter((item) => item.bookingId === input.bookingId);
    const submission: Submission = {
      id: `sub_${randomUUID().replaceAll('-', '')}`,
      bookingId: input.bookingId,
      version: existing.length + 1,
      note: input.note,
      items: input.items,
      postingProofs: input.postingProofs,
      submittedByUserId: input.submittedByUserId,
      createdAt: new Date().toISOString(),
    };
    this.submissions.push(submission);
    return Promise.resolve(submission);
  }

  listByBooking(bookingId: string): Promise<readonly Submission[]> {
    return Promise.resolve(
      this.submissions
        .filter((item) => item.bookingId === bookingId)
        .sort((a, b) => a.version - b.version),
    );
  }

  latest(bookingId: string): Promise<Submission | null> {
    const ofBooking = this.submissions.filter((item) => item.bookingId === bookingId);
    const newest = ofBooking.reduce<Submission | null>(
      (best, item) => (best === null || item.version > best.version ? item : best),
      null,
    );
    return Promise.resolve(newest);
  }

  createRevision(input: CreateRevisionInput): Promise<RevisionRequest> {
    const revision: RevisionRequest = {
      id: `rev_${randomUUID().replaceAll('-', '')}`,
      bookingId: input.bookingId,
      submissionVersion: input.submissionVersion,
      reason: input.reason,
      requestedByUserId: input.requestedByUserId,
      createdAt: new Date().toISOString(),
    };
    this.revisions.push(revision);
    return Promise.resolve(revision);
  }

  listRevisions(bookingId: string): Promise<readonly RevisionRequest[]> {
    return Promise.resolve(
      this.revisions
        .filter((item) => item.bookingId === bookingId)
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
    );
  }

  countRevisions(bookingId: string): Promise<number> {
    return Promise.resolve(this.revisions.filter((item) => item.bookingId === bookingId).length);
  }
}
