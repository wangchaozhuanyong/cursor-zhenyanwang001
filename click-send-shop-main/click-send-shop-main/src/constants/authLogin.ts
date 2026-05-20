/**
 * 是否展示微信 / Google 等第三方登录入口（暂时关闭，仅手机号登录）。
 * 恢复时改为 true，并同步后端 THIRD_PARTY_LOGIN_ENABLED=1。
 *
 * 隐藏的前端模块（便于找回）：
 * - Login.tsx：第三方登录区 / OAuth 回调
 * - ProfileWechatBindSection.tsx：「我的」页微信绑定条
 * - Settings.tsx：微信绑定卡片
 */
export const THIRD_PARTY_LOGIN_ENABLED =
  import.meta.env.VITE_THIRD_PARTY_LOGIN_ENABLED === "true";

/**
 * 可选构建时声明短信验证码登录是否开启，避免首屏等 /auth/features 时闪一下切换条。
 * VITE_SMS_OTP_LOGIN_ENABLED=true | false；未设置则仅依赖接口 + session 缓存。
 */
export const SMS_OTP_LOGIN_BUILD_HINT: boolean | null =
  import.meta.env.VITE_SMS_OTP_LOGIN_ENABLED === "true"
    ? true
    : import.meta.env.VITE_SMS_OTP_LOGIN_ENABLED === "false"
      ? false
      : null;
