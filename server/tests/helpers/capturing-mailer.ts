import type { Mailer, OutboundEmail } from '../../src/shared/email/mailer.js';

/** Mailer giả cho test — giữ lại email đã gửi để assert nội dung/OTP. */
export class CapturingMailer implements Mailer {
  readonly sent: OutboundEmail[] = [];

  send(email: OutboundEmail): Promise<void> {
    this.sent.push(email);
    return Promise.resolve();
  }

  /** Lấy mã OTP 6 chữ số trong email gần nhất gửi tới địa chỉ `to`. */
  lastOtpFor(to: string): string | null {
    const forRecipient = this.sent.filter((email) => email.to === to);
    const last = forRecipient[forRecipient.length - 1];
    const match = last?.text.match(/\b(\d{6})\b/);
    return match?.[1] ?? null;
  }
}
