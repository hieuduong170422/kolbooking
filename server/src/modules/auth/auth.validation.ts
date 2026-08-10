import { z } from 'zod';
import { SELF_REGISTER_ROLES } from '../users/user.types.js';

const emailSchema = z.email('Email không hợp lệ.').max(254).transform((value) => value.toLowerCase());

const passwordSchema = z
  .string()
  .min(8, 'Mật khẩu tối thiểu 8 ký tự.')
  .max(72, 'Mật khẩu tối đa 72 ký tự.')
  .regex(/[A-Za-z]/, 'Mật khẩu phải có ít nhất một chữ cái.')
  .regex(/\d/, 'Mật khẩu phải có ít nhất một chữ số.');

export const registerBodySchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  displayName: z.string().trim().min(2, 'Tên hiển thị tối thiểu 2 ký tự.').max(50),
  role: z.enum(SELF_REGISTER_ROLES, 'Vai trò phải là creator hoặc brand.'),
  // AUTH-007: đăng ký bắt buộc chấp thuận điều khoản một cách tường minh.
  termsAccepted: z.literal(true, 'Bạn cần đồng ý Điều khoản sử dụng để đăng ký.'),
});

export type RegisterBody = z.infer<typeof registerBodySchema>;

export const loginBodySchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Vui lòng nhập mật khẩu.'),
});

export type LoginBody = z.infer<typeof loginBodySchema>;

const otpCodeSchema = z
  .string()
  .regex(/^\d{6}$/, 'Mã xác minh gồm 6 chữ số.');

export const verifyEmailBodySchema = z.object({
  code: otpCodeSchema,
});

export type VerifyEmailBody = z.infer<typeof verifyEmailBodySchema>;

export const forgotPasswordBodySchema = z.object({
  email: emailSchema,
});

export type ForgotPasswordBody = z.infer<typeof forgotPasswordBodySchema>;

export const resetPasswordBodySchema = z.object({
  email: emailSchema,
  code: otpCodeSchema,
  newPassword: passwordSchema,
});

export type ResetPasswordBody = z.infer<typeof resetPasswordBodySchema>;
