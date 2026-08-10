import { apiGet, apiPost } from '../../../shared/api/http-client';

export interface SubmissionItem {
  readonly deliverableIndex: number;
  readonly fileUrl: string | null;
  readonly linkUrl: string | null;
  readonly description: string;
}

export interface PostingProof {
  readonly platform: string;
  readonly url: string;
}

export interface Submission {
  readonly id: string;
  readonly bookingId: string;
  readonly version: number;
  readonly note: string;
  readonly items: readonly SubmissionItem[];
  readonly postingProofs: readonly PostingProof[];
  readonly submittedByUserId: string;
  readonly createdAt: string;
}

export interface RevisionRequest {
  readonly id: string;
  readonly bookingId: string;
  readonly submissionVersion: number;
  readonly reason: string;
  readonly requestedByUserId: string;
  readonly createdAt: string;
}

/** Toàn bộ trạng thái bàn giao của một booking (DLV-003, DLV-004). */
export interface FulfillmentState {
  readonly submissions: readonly Submission[];
  readonly revisions: readonly RevisionRequest[];
  readonly revisionsUsed: number;
  readonly revisionsIncluded: number;
}

export interface SubmitInput {
  readonly note: string;
  readonly items: readonly SubmissionItem[];
  readonly postingProofs: readonly PostingProof[];
}

export const fetchFulfillment = async (bookingId: string): Promise<FulfillmentState> => {
  const response = await apiGet<FulfillmentState>(`/bookings/${bookingId}/submissions`);
  return response.data;
};

export const submitDeliverables = async (
  bookingId: string,
  input: SubmitInput,
): Promise<Submission> => {
  const response = await apiPost<{ submission: Submission }>(
    `/bookings/${bookingId}/submissions`,
    input,
  );
  return response.data.submission;
};

export const requestRevision = async (
  bookingId: string,
  reason: string,
): Promise<RevisionRequest> => {
  const response = await apiPost<{ revision: RevisionRequest }>(
    `/bookings/${bookingId}/revisions`,
    { reason },
  );
  return response.data.revision;
};
