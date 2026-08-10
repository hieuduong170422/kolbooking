import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import type { Express } from 'express';
import { InMemorySessionRepository } from '../src/modules/auth/session.repository.memory.js';
import { InMemoryVerificationTokenRepository } from '../src/modules/auth/verification.repository.memory.js';
import { hashOtp } from '../src/modules/auth/verification.service.js';
import { InMemoryUserRepository } from '../src/modules/users/user.repository.memory.js';
import { CapturingMailer } from './helpers/capturing-mailer.js';
import { buildTestApp } from './helpers/build-test-app.js';

let app: Express;
let mailer: CapturingMailer;
let users: InMemoryUserRepository;
let sessions: InMemorySessionRepository;
let verificationTokens: InMemoryVerificationTokenRepository;

const EMAIL = 'tanbinh@test.vn';

const registerPayload = {
  email: EMAIL,
  password: 'MatKhau123',
  displayName: 'Tân Binh',
  role: 'creator',
  termsAccepted: true,
};

/** Đăng ký tài khoản mới, trả về accessToken để gọi các API cần auth. */
const registerAndGetToken = async (): Promise<string> => {
  const response = await request(app).post('/api/v1/auth/register').send(registerPayload);
  expect(response.status).toBe(201);
  return response.body.data.accessToken as string;
};

beforeEach(() => {
  mailer = new CapturingMailer();
  users = new InMemoryUserRepository();
  sessions = new InMemorySessionRepository();
  verificationTokens = new InMemoryVerificationTokenRepository();
  app = buildTestApp({
    userRepository: users,
    sessionRepository: sessions,
    verificationTokenRepository: verificationTokens,
    mailer,
  });
});

describe('AUTH-002 — xác minh email bằng OTP', () => {
  it('đăng ký xong thì emailVerified=false và OTP được gửi qua mailer', async () => {
    const response = await request(app).post('/api/v1/auth/register').send(registerPayload);

    expect(response.status).toBe(201);
    expect(response.body.data.user.emailVerified).toBe(false);
    const otp = mailer.lastOtpFor(EMAIL);
    expect(otp).toMatch(/^\d{6}$/);
  });

  it('xác minh sai mã trả 400, đúng mã trả user emailVerified=true', async () => {
    const token = await registerAndGetToken();

    const wrong = await request(app)
      .post('/api/v1/auth/verify-email/confirm')
      .set('Authorization', `Bearer ${token}`)
      .send({ code: '000000' });
    expect(wrong.status).toBe(400);

    const otp = mailer.lastOtpFor(EMAIL);
    const confirmed = await request(app)
      .post('/api/v1/auth/verify-email/confirm')
      .set('Authorization', `Bearer ${token}`)
      .send({ code: otp });
    expect(confirmed.status).toBe(200);
    expect(confirmed.body.data.user.emailVerified).toBe(true);

    const me = await request(app).get('/api/v1/auth/me').set('Authorization', `Bearer ${token}`);
    expect(me.body.data.user.emailVerified).toBe(true);
  });

  it('mã chỉ dùng được một lần', async () => {
    const token = await registerAndGetToken();
    const otp = mailer.lastOtpFor(EMAIL);

    const first = await request(app)
      .post('/api/v1/auth/verify-email/confirm')
      .set('Authorization', `Bearer ${token}`)
      .send({ code: otp });
    expect(first.status).toBe(200);

    // Người dùng đã verify → xác minh lại với mã cũ phải bị từ chối.
    const reuse = await request(app)
      .post('/api/v1/auth/verify-email/confirm')
      .set('Authorization', `Bearer ${token}`)
      .send({ code: otp });
    expect(reuse.status).toBe(400);
  });

  it('yêu cầu gửi lại mã làm mã cũ mất hiệu lực', async () => {
    const token = await registerAndGetToken();
    const oldOtp = mailer.lastOtpFor(EMAIL);

    const resend = await request(app)
      .post('/api/v1/auth/verify-email/request')
      .set('Authorization', `Bearer ${token}`)
      .send({});
    expect(resend.status).toBe(200);

    const newOtp = mailer.lastOtpFor(EMAIL);
    expect(newOtp).not.toBe(oldOtp);

    const withOld = await request(app)
      .post('/api/v1/auth/verify-email/confirm')
      .set('Authorization', `Bearer ${token}`)
      .send({ code: oldOtp });
    expect(withOld.status).toBe(400);

    const withNew = await request(app)
      .post('/api/v1/auth/verify-email/confirm')
      .set('Authorization', `Bearer ${token}`)
      .send({ code: newOtp });
    expect(withNew.status).toBe(200);
  });

  it('mã hết hạn bị từ chối', async () => {
    const token = await registerAndGetToken();
    const user = await users.findByEmail(EMAIL);
    expect(user).not.toBeNull();

    // Vô hiệu mã hiện tại, tạo trực tiếp một mã đã hết hạn trong repository.
    await verificationTokens.invalidateAllFor(user!.id, 'email_verify');
    await verificationTokens.create({
      userId: user!.id,
      purpose: 'email_verify',
      codeHash: hashOtp('123456'),
      expiresAt: new Date(Date.now() - 1000).toISOString(),
    });

    const response = await request(app)
      .post('/api/v1/auth/verify-email/confirm')
      .set('Authorization', `Bearer ${token}`)
      .send({ code: '123456' });
    expect(response.status).toBe(400);
  });

  it('nhập sai quá số lần cho phép thì mã bị khóa kể cả khi nhập đúng', async () => {
    const token = await registerAndGetToken();
    const otp = mailer.lastOtpFor(EMAIL);

    for (let i = 0; i < 5; i += 1) {
      await request(app)
        .post('/api/v1/auth/verify-email/confirm')
        .set('Authorization', `Bearer ${token}`)
        .send({ code: '999999' });
    }

    const lockedOut = await request(app)
      .post('/api/v1/auth/verify-email/confirm')
      .set('Authorization', `Bearer ${token}`)
      .send({ code: otp });
    expect(lockedOut.status).toBe(400);
  });

  it('tài khoản chưa xác minh không được submit hồ sơ review (gate giao dịch)', async () => {
    const token = await registerAndGetToken();

    const response = await request(app)
      .post('/api/v1/creators/me/submit-review')
      .set('Authorization', `Bearer ${token}`)
      .send({});
    expect(response.status).toBe(403);
    expect(response.body.error.message).toContain('xác minh email');
  });
});

describe('AUTH-004 — quên mật khẩu và đặt lại', () => {
  it('email không tồn tại vẫn trả 200 (không lộ tài khoản)', async () => {
    const response = await request(app)
      .post('/api/v1/auth/password/forgot')
      .send({ email: 'khongtontai@test.vn' });

    expect(response.status).toBe(200);
    expect(mailer.sent).toHaveLength(0);
  });

  it('đặt lại mật khẩu thành công: mật khẩu mới dùng được, phiên cũ bị thu hồi, mã chỉ dùng một lần', async () => {
    const registered = await request(app).post('/api/v1/auth/register').send(registerPayload);
    const cookies = registered.headers['set-cookie'] as unknown as string[];
    const refreshCookie = cookies
      .find((cookie) => cookie.startsWith('kb_refresh='))!
      .split(';')[0] as string;

    await request(app).post('/api/v1/auth/password/forgot').send({ email: EMAIL });
    const otp = mailer.lastOtpFor(EMAIL);
    expect(otp).toMatch(/^\d{6}$/);

    const wrongCode = await request(app)
      .post('/api/v1/auth/password/reset')
      .send({ email: EMAIL, code: '000000', newPassword: 'MatKhauMoi99' });
    expect(wrongCode.status).toBe(400);

    const reset = await request(app)
      .post('/api/v1/auth/password/reset')
      .send({ email: EMAIL, code: otp, newPassword: 'MatKhauMoi99' });
    expect(reset.status).toBe(200);

    // Mật khẩu cũ hết dùng được, mật khẩu mới đăng nhập OK.
    const oldLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: EMAIL, password: 'MatKhau123' });
    expect(oldLogin.status).toBe(401);

    const newLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: EMAIL, password: 'MatKhauMoi99' });
    expect(newLogin.status).toBe(200);

    // Refresh token cấp trước khi reset đã bị thu hồi.
    const refresh = await request(app).post('/api/v1/auth/refresh').set('Cookie', refreshCookie);
    expect(refresh.status).toBe(401);

    // Mã reset không dùng lại được.
    const reuse = await request(app)
      .post('/api/v1/auth/password/reset')
      .send({ email: EMAIL, code: otp, newPassword: 'MatKhauKhac77' });
    expect(reuse.status).toBe(400);
  });

  it('mật khẩu mới yếu bị từ chối bởi validation', async () => {
    const response = await request(app)
      .post('/api/v1/auth/password/reset')
      .send({ email: EMAIL, code: '123456', newPassword: 'ngan' });
    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });
});

describe('AUTH-007 — ghi nhận consent điều khoản', () => {
  it('đăng ký thiếu termsAccepted bị từ chối', async () => {
    const { termsAccepted: _omitted, ...withoutConsent } = registerPayload;
    const response = await request(app).post('/api/v1/auth/register').send(withoutConsent);

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('đăng ký thành công lưu consent version + timestamp + nguồn', async () => {
    await request(app).post('/api/v1/auth/register').send(registerPayload);

    const user = await users.findByEmail(EMAIL);
    expect(user?.consent).not.toBeNull();
    expect(user?.consent?.version).toBeTruthy();
    expect(Date.parse(user!.consent!.acceptedAt)).not.toBeNaN();
    expect(user?.consent?.source).toBe('web_register');
  });
});
