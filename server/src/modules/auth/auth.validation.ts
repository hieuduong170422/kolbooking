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
});

export type RegisterBody = z.infer<typeof registerBodySchema>;

export const loginBodySchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Vui lòng nhập mật khẩu.'),
});

export type LoginBody = z.infer<typeof loginBodySchema>;
