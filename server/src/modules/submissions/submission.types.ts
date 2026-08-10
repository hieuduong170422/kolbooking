/** Một đầu ra được nộp, map tới deliverable thứ mấy trong snapshot (DLV-001). */
export interface SubmissionItem {
  /** Vị trí deliverable trong snapshot.deliverables — ràng buộc nộp đủ. */
  readonly deliverableIndex: number;
  /** File đã upload hoặc link công khai; ít nhất một trong hai. */
  readonly fileUrl: string | null;
  readonly linkUrl: string | null;
  readonly description: string;
}

/** Bằng chứng đã đăng công khai (DLV-006). */
export interface PostingProof {
  readonly platform: string;
  readonly url: string;
}

/** Một lần nộp bài — giữ toàn bộ version, không ghi đè (DLV-004). */
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

export type CreateSubmissionInput = Omit<Submission, 'id' | 'version' | 'createdAt'>;

/** Một lần brand yêu cầu sửa — dùng để đếm hạn mức revision (DLV-003). */
export interface RevisionRequest {
  readonly id: string;
  readonly bookingId: string;
  /** Version bị yêu cầu sửa. */
  readonly submissionVersion: number;
  readonly reason: string;
  readonly requestedByUserId: string;
  readonly createdAt: string;
}

export type CreateRevisionInput = Omit<RevisionRequest, 'id' | 'createdAt'>;
