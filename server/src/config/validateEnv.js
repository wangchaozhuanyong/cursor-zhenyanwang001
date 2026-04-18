/**
 * 启动前校验关键环境变量（生产环境更严格）
 */
function validateEnv() {
  const isProd = process.env.NODE_ENV === 'production';
  const jwt = process.env.JWT_SECRET || '';

  const placeholderMarkers = [
    'your_jwt_secret_change_me',
    '__SET_PRODUCTION_ORIGIN__',
    'REPLACE_ME',
    'CHANGE_ME_TO_YOUR',
  ];

  const hasPlaceholder = (s) =>
    placeholderMarkers.some((m) => s.includes(m));

  if (isProd) {
    if (!jwt || jwt.length < 64) {
      console.error(
        '[FATAL] 生产环境 JWT_SECRET 须为强随机字符串，长度至少 64（建议使用 openssl rand -hex 48 或等价方式生成）',
      );
      process.exit(1);
    }
    if (/your_jwt_secret_change_me/i.test(jwt) || jwt === 'change_me') {
      console.error('[FATAL] 生产环境请勿使用 .env.example 中的示例 JWT_SECRET');
      process.exit(1);
    }

    const cors = process.env.CORS_ORIGINS || '';
    if (!cors.trim()) {
      console.error('[FATAL] 生产环境必须设置 CORS_ORIGINS（逗号分隔的完整 Origin 列表，禁止使用 *）');
      process.exit(1);
    }
    if (cors.includes('*')) {
      console.error('[FATAL] 生产环境 CORS_ORIGINS 禁止使用通配符 *');
      process.exit(1);
    }
    if (hasPlaceholder(cors)) {
      console.error(
        '[FATAL] 生产环境 CORS_ORIGINS 仍含占位符，请替换为真实前端访问 Origin（含 https:// 与端口）',
      );
      process.exit(1);
    }

    const pub = process.env.PUBLIC_APP_URL || '';
    if (!pub.trim()) {
      console.error(
        '[FATAL] 生产环境必须设置 PUBLIC_APP_URL（用户访问前端的完整根地址，无尾部斜杠，须为 https）',
      );
      process.exit(1);
    }
    if (!pub.startsWith('https://')) {
      console.error('[FATAL] 生产环境 PUBLIC_APP_URL 须以 https:// 开头');
      process.exit(1);
    }
    if (hasPlaceholder(pub)) {
      console.error('[FATAL] 生产环境 PUBLIC_APP_URL 仍含占位符，请替换为正式域名');
      process.exit(1);
    }

    const sk = process.env.STRIPE_SECRET_KEY || '';
    const wh = process.env.STRIPE_WEBHOOK_SECRET || '';
    const stripePartial = (sk && !wh) || (!sk && wh);
    if (stripePartial) {
      console.error(
        '[FATAL] 启用 Stripe 时须同时设置 STRIPE_SECRET_KEY 与 STRIPE_WEBHOOK_SECRET',
      );
      process.exit(1);
    }
    if (sk && (!wh || wh.length < 10)) {
      console.error('[FATAL] STRIPE_WEBHOOK_SECRET 无效或过短');
      process.exit(1);
    }
  } else if (jwt && jwt.length < 64) {
    console.warn('[WARN] JWT_SECRET 长度不足 64，仅用于开发环境；上线前须更换为 ≥64 位强随机值');
  }
}

module.exports = { validateEnv };
