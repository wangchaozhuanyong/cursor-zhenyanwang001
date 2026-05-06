/**
 * Auth 模块入参 Schemas（Zod）
 *
 * - 仅做“形状校验 + 简单清洗”（如 trim / 长度 / 必填），
 *   业务唯一性/比对（如手机号是否被占用、旧密码是否匹配）仍在 service。
 * - 命名约定：`xxxBodySchema` / `xxxQuerySchema` / `xxxParamsSchema`。
 */
import { z } from 'zod';

export const phoneSchema = z
  .string({ message: '手机号不能为空' })
  .trim()
  .regex(/^[0-9\s\-()]+$/, '手机号格式不正确')
  .min(4, '手机号长度不正确')
  .max(20, '手机号长度不正确');

export const countryCodeSchema = z
  .string({ message: '国家代码不能为空' })
  .trim()
  .regex(/^\+?[0-9]{1,4}$/, '国家代码格式不正确');

export const passwordSchema = z
  .string({ message: '密码不能为空' })
  .min(6, '密码至少 6 位')
  .max(64, '密码不能超过 64 位');

export const registerBodySchema = z.object({
  countryCode: countryCodeSchema,
  phone: phoneSchema,
  password: passwordSchema,
  nickname: z.string().trim().max(32).optional(),
  inviteCode: z.string().trim().max(32).optional(),
});

export const loginBodySchema = z
  .object({
    phone: z.string().trim().min(1).max(20).optional(),
    countryCode: countryCodeSchema.optional(),
    username: z.string().trim().min(1).max(20).optional(),
    password: passwordSchema,
  })
  .refine((v) => Boolean(v.phone || v.username), {
    message: '请提供手机号',
    path: ['phone'],
  });

export const refreshBodySchema = z.object({
  refreshToken: z.string({ message: 'refreshToken 不能为空' }).min(1, 'refreshToken 不能为空'),
});

export const updateProfileBodySchema = z
  .object({
    nickname: z.string().trim().max(32).optional(),
    avatar: z.string().trim().max(512).optional(),
    phone: phoneSchema.optional(),
    countryCode: countryCodeSchema.optional(),
    wechat: z.string().trim().max(64).optional(),
    whatsapp: z.string().trim().max(64).optional(),
  })
  .refine(
    (v) =>
      v.nickname !== undefined
      || v.avatar !== undefined
      || v.phone !== undefined
      || v.wechat !== undefined
      || v.whatsapp !== undefined,
    { message: '没有需要更新的字段', path: [] },
  );

export const changePasswordBodySchema = z.object({
  oldPassword: z.string({ message: '请输入旧密码' }).min(1, '请输入旧密码'),
  newPassword: passwordSchema,
});

export type RegisterBody = z.infer<typeof registerBodySchema>;
export type LoginBody = z.infer<typeof loginBodySchema>;
export type RefreshBody = z.infer<typeof refreshBodySchema>;
export type UpdateProfileBody = z.infer<typeof updateProfileBodySchema>;
export type ChangePasswordBody = z.infer<typeof changePasswordBodySchema>;
