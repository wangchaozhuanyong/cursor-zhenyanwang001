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
