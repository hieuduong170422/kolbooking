import { logger } from '../logger/logger.js';

export interface OutboundEmail {
  readonly to: string;
  readonly subject: string;
  readonly text: string;
}

/** Cổng gửi email — NTF-002 sẽ thay bằng adapter provider thật ở phase Notification. */
export interface Mailer {
  send(email: OutboundEmail): Promise<void>;
}

/**
 * Mailer dev: in email ra log thay vì gửi thật (OTP đọc được từ console).
 * KHÔNG dùng cho production — bootstrap phải thay bằng adapter thật trước khi mở pilot.
 */
export class ConsoleMailer implements Mailer {
  send(email: OutboundEmail): Promise<void> {
    logger.info({ to: email.to, subject: email.subject, body: email.text }, '[dev-mailer] email');
    return Promise.resolve();
  }
}
