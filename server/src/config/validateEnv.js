/**
 * 启动前校验关键环境变量（生产环境更严格）
 */
function validateEnv() {
  const isProd = process.env.NODE_ENV === 'production';
  const storageDriver = (process.env.STORAGE_DRIVER || '').trim().toLowerCase();
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
    const dbUser = String(process.env.DB_USER || '').trim().toLowerCase();
    if (!dbUser) {
      console.error('[FATAL] 生产环境必须显式设置 DB_USER（禁止使用默认值）');
      process.exit(1);
    }
    if (dbUser === 'root') {
      console.error('[FATAL] 生产环境禁止使用 DB_USER=root，请改为最小权限应用账号');
      process.exit(1);
    }

    if (process.env.AUTO_PROMOTE_FIRST_USER_TO_ADMIN === '1') {
      console.error(
        '[FATAL] 生产环境禁止 AUTO_PROMOTE_FIRST_USER_TO_ADMIN=1（首个注册用户会成为管理员）；请改为 0 并使用 npm run admin:create',
      );
      process.exit(1);
    }

    const exposeOtp = String(process.env.EXPOSE_OTP_CODE || '').toLowerCase();
    if (exposeOtp === 'true' || exposeOtp === '1') {
      console.error('[FATAL] 生产环境禁止 EXPOSE_OTP_CODE（验证码不得回显给客户端）');
      process.exit(1);
    }

    if (storageDriver === 's3') {
      const requiredS3 = [
        'STORAGE_S3_BUCKET',
        'STORAGE_S3_ACCESS_KEY_ID',
        'STORAGE_S3_SECRET_ACCESS_KEY',
        'STORAGE_PUBLIC_BASE_URL',
      ];
      const missingS3 = requiredS3.filter((k) => !(process.env[k] || '').trim());
      if (missingS3.length > 0) {
        console.error(`[FATAL] STORAGE_DRIVER=s3 时缺少配置: ${missingS3.join(', ')}`);
        process.exit(1);
      }
    }

    if (!jwt || jwt.length < 64) {
      console.error(
        '[FATAL] 生产环境 JWT_SECRET 须为强随机字符串，长度至少 64（建议使用 openssl rand -hex 48 或等价方式生成）',
      );
      process.exit(1);
    }
    if (hasPlaceholder(jwt) || /your_jwt_secret_change_me/i.test(jwt) || jwt === 'change_me') {
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

    const corsOrigins = cors.split(',').map((s) => s.trim()).filter(Boolean);
    const hasLocalOrigin = corsOrigins.some((o) => {
      const lower = o.toLowerCase();
      return lower.includes('localhost') || lower.includes('127.0.0.1');
    });
    if (hasLocalOrigin) {
      console.error(
        '[FATAL] 生产环境 CORS_ORIGINS 不得包含 localhost / 127.0.0.1；请仅保留真实用户访问的 https Origin',
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
    const pubLower = pub.toLowerCase();
    if (pubLower.includes('localhost') || pubLower.includes('127.0.0.1')) {
      console.error('[FATAL] 生产环境 PUBLIC_APP_URL 不得为 localhost / 127.0.0.1');
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

    if (process.env.MYINVOIS_SUBMIT_ENABLED === '1' && process.env.MYINVOIS_ENABLED !== '1') {
      console.error('[FATAL] MYINVOIS_SUBMIT_ENABLED=1 时必须同时设置 MYINVOIS_ENABLED=1');
      process.exit(1);
    }

    const redisConfigured = Boolean(
      (process.env.REDIS_URL || process.env.REDIS_CONNECTION_STRING || '').trim()
      || (process.env.REDIS_HOST || '').trim(),
    );
    if (!redisConfigured) {
      console.warn(
        '[WARN] 生产环境未配置 Redis（REDIS_URL 或 REDIS_HOST）；缓存、分布式锁与 BullMQ 队列将无法正常工作',
      );
    }

    if (storageDriver !== 's3') {
      console.warn(
        '[WARN] 生产环境建议 STORAGE_DRIVER=s3，避免用户上传落在本地 public/uploads（见 docs/security/backend-upload-go-live-checklist.md）',
      );
    }

    const smsLoginEnabled = ['1', 'true', 'yes', 'on'].includes(
      String(process.env.SMS_LOGIN_ENABLED || '').toLowerCase(),
    );
    if (smsLoginEnabled) {
      const hasSmsProvider = Boolean(
        (process.env.SMS_PROVIDER || '').trim()
        || process.env.TWILIO_ACCOUNT_SID
        || process.env.SMS_HTTP_URL,
      );
      if (!hasSmsProvider) {
        console.warn(
          '[WARN] SMS_LOGIN_ENABLED=1 但未配置 SMS_PROVIDER / Twilio / SMS_HTTP_URL，OTP 发送将失败',
        );
      }
    }
  } else if (!jwt) {
    console.warn('[WARN] JWT_SECRET 未设置；非生产环境会使用进程内临时随机密钥，重启后 token 会失效');
  } else if (jwt.length < 64 || hasPlaceholder(jwt) || jwt === 'change_me') {
    console.warn('[WARN] JWT_SECRET 不应使用短值或示例值；上线前须更换为 ≥64 位强随机值');
  }

  if (process.env.MYINVOIS_ENABLED !== '1' && process.env.MYINVOIS_SUBMIT_ENABLED === '1') {
    console.warn('[WARN] MYINVOIS_SUBMIT_ENABLED=1 但 MYINVOIS_ENABLED 未开启，MyInvois 提交不会运行');
  }
}

module.exports = { validateEnv };
