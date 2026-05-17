const { z } = require('zod');

const phoneSchema = z
  .string({ message: '手机号不能为空' })
  .trim()
  .regex(/^\+?[0-9\s\-()]+$/, '手机号格式不正确')
  .min(4, '手机号长度不正确')
  .max(20, '手机号长度不正确');

const countryCodeSchema = z
  .string({ message: '国家代码不能为空' })
  .trim()
  .refine((v) => {
    const d = v.replace(/\D+/g, '');
    return d === '60' || d === '86';
  }, '仅支持 +60 或 +86');

const passwordSchema = z
  .string({ message: '密码不能为空' })
  .min(6, '密码至少 6 位')
  .max(64, '密码不能超过 64 位');

const registerBodySchema = z.object({
  countryCode: countryCodeSchema,
  phone: phoneSchema,
  password: passwordSchema,
  nickname: z.string().trim().max(32).optional(),
  inviteCode: z.string().trim().max(32).optional(),
});

const loginBodySchema = z
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

const refreshBodySchema = z.object({
  refreshToken: z.string().min(1, 'refreshToken 不能为空').optional(),
});

const updateProfileBodySchema = z
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

const changePasswordBodySchema = z.object({
  oldPassword: z.string({ message: '请输入旧密码' }).min(1, '请输入旧密码'),
  newPassword: passwordSchema,
});

const requestPasswordResetBodySchema = z.object({
  countryCode: countryCodeSchema.optional(),
  phone: phoneSchema,
});

const resetPasswordBodySchema = z.object({
  token: z.string({ message: '重置令牌不能为空' }).trim().min(16, '重置令牌无效').max(128, '重置令牌无效'),
  newPassword: passwordSchema,
});

const oauthProviderParamSchema = z.object({
  provider: z.enum(['google']),
});

const oauthStartQuerySchema = z.object({
  redirect: z.string().trim().max(512).optional(),
});

const oauthExchangeBodySchema = z.object({
  provider: z.enum(['google']),
  code: z.string({ message: '登录凭证无效' }).trim().min(16, '登录凭证无效').max(128, '登录凭证无效'),
});

const wechatBindPhoneBodySchema = z.object({
  countryCode: countryCodeSchema,
  phone: phoneSchema,
  smsCode: z
    .string({ message: '验证码不能为空' })
    .trim()
    .regex(/^\d{6}$/, '验证码须为 6 位数字'),
  pendingWechatToken: z
    .string({ message: '绑定凭证无效' })
    .trim()
    .min(16, '绑定凭证无效')
    .max(128, '绑定凭证无效'),
});

const otpSendBodySchema = z.object({
  countryCode: countryCodeSchema,
  phone: phoneSchema,
});

const wechatOtpSendBodySchema = otpSendBodySchema;

const otpLoginBodySchema = z.object({
  countryCode: countryCodeSchema,
  phone: phoneSchema,
  code: z
    .string({ message: '验证码不能为空' })
    .trim()
    .regex(/^\d{6}$/, '验证码须为 6 位数字'),
});

module.exports = {
  phoneSchema,
  passwordSchema,
  registerBodySchema,
  loginBodySchema,
  refreshBodySchema,
  updateProfileBodySchema,
  changePasswordBodySchema,
  requestPasswordResetBodySchema,
  resetPasswordBodySchema,
  oauthProviderParamSchema,
  oauthStartQuerySchema,
  oauthExchangeBodySchema,
  wechatBindPhoneBodySchema,
  wechatOtpSendBodySchema,
  otpSendBodySchema,
  otpLoginBodySchema,
};
