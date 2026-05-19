const { z } = require('zod');
const { validatePhoneForCountry } = require('../../../utils/phone');

const phoneSchema = z
  .string({ message: '请填写手机号' })
  .trim()
  .regex(/^\+?[0-9\s\-()]+$/, '手机号只能包含数字、空格、括号或横线')
  .min(4, '手机号长度不正确')
  .max(20, '手机号长度不正确');

const countryCodeSchema = z
  .string({ message: '请选择国家或地区代码' })
  .trim()
  .refine((v) => {
    const d = v.replace(/\D+/g, '');
    return d === '60' || d === '86';
  }, '仅支持 +60 或 +86');

const loginPasswordSchema = z
  .string({ message: '请填写密码' })
  .min(1, '请填写密码')
  .max(64, '密码不能超过 64 位');

const strongPasswordSchema = z
  .string({ message: '请填写密码' })
  .min(8, '密码至少 8 位，并包含大写字母、小写字母和数字')
  .max(64, '密码不能超过 64 位')
  .refine((v) => /[a-z]/.test(v) && /[A-Z]/.test(v) && /\d/.test(v), {
    message: '密码必须包含大写字母、小写字母和数字',
  });

function withCountryPhoneValidation(schema) {
  return schema.superRefine((value, ctx) => {
    if (!value.phone || !value.countryCode) return;
    const message = validatePhoneForCountry(value.phone, value.countryCode);
    if (message) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message,
        path: ['phone'],
      });
    }
  });
}

const registerBodySchema = withCountryPhoneValidation(z.object({
  countryCode: countryCodeSchema,
  phone: phoneSchema,
  password: strongPasswordSchema,
  nickname: z.string().trim().max(32, '昵称不能超过 32 个字').optional(),
  inviteCode: z.string().trim().max(32, '邀请码不能超过 32 位').optional(),
}));

const loginBodySchema = withCountryPhoneValidation(
  z
    .object({
      phone: z.string().trim().min(1, '请填写手机号').max(20, '手机号长度不正确').optional(),
      countryCode: countryCodeSchema.optional(),
      username: z.string().trim().min(1, '请填写手机号').max(20, '手机号长度不正确').optional(),
      password: loginPasswordSchema,
    })
    .refine((v) => Boolean(v.phone || v.username), {
      message: '请填写手机号',
      path: ['phone'],
    }),
);

const refreshBodySchema = z.object({
  refreshToken: z.string().min(1, 'refreshToken 不能为空').optional(),
});

const updateProfileBodySchema = withCountryPhoneValidation(
  z
    .object({
      nickname: z.string().trim().max(32, '昵称不能超过 32 个字').optional(),
      avatar: z.string().trim().max(512, '头像地址过长').optional(),
      phone: phoneSchema.optional(),
      countryCode: countryCodeSchema.optional(),
      wechat: z.string().trim().max(64, '微信号过长').optional(),
      whatsapp: z.string().trim().max(64, 'WhatsApp 过长').optional(),
    })
    .refine(
      (v) =>
        v.nickname !== undefined
        || v.avatar !== undefined
        || v.phone !== undefined
        || v.wechat !== undefined
        || v.whatsapp !== undefined,
      { message: '没有需要更新的字段', path: [] },
    ),
);

const changePasswordBodySchema = z.object({
  oldPassword: z.string({ message: '请输入旧密码' }).min(1, '请输入旧密码'),
  newPassword: strongPasswordSchema,
});

const requestPasswordResetBodySchema = withCountryPhoneValidation(z.object({
  countryCode: countryCodeSchema.optional(),
  phone: phoneSchema,
}));

const resetPasswordBodySchema = z.object({
  token: z.string({ message: '重置令牌不能为空' }).trim().min(16, '重置令牌无效').max(128, '重置令牌无效'),
  newPassword: strongPasswordSchema,
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

const wechatBindPhoneBodySchema = withCountryPhoneValidation(z.object({
  countryCode: countryCodeSchema,
  phone: phoneSchema,
  smsCode: z
    .string({ message: '验证码不能为空' })
    .trim()
    .regex(/^\d{6}$/, '验证码必须是 6 位数字'),
  pendingWechatToken: z
    .string({ message: '绑定凭证无效' })
    .trim()
    .min(16, '绑定凭证无效')
    .max(128, '绑定凭证无效'),
}));

const otpSendBodySchema = withCountryPhoneValidation(z.object({
  countryCode: countryCodeSchema,
  phone: phoneSchema,
}));

const wechatOtpSendBodySchema = otpSendBodySchema;

const otpLoginBodySchema = withCountryPhoneValidation(z.object({
  countryCode: countryCodeSchema,
  phone: phoneSchema,
  code: z
    .string({ message: '验证码不能为空' })
    .trim()
    .regex(/^\d{6}$/, '验证码必须是 6 位数字'),
}));

module.exports = {
  phoneSchema,
  passwordSchema: strongPasswordSchema,
  loginPasswordSchema,
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
