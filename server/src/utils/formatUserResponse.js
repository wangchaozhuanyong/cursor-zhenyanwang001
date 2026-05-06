function maskPhone(phone) {
  const s = String(phone || '').trim();
  // 常见手机号长度 11（CN）或更长（含国家码）；只做通用掩码
  if (s.length <= 4) return s ? '*'.repeat(s.length) : '';
  const head = s.slice(0, 3);
  const tail = s.slice(-4);
  return `${head}****${tail}`;
}

/**
 * Role-Based Data Masking: 将 user 数据转换为安全可返回结构
 *
 * 约束：
 * - 永远剔除密码学/支付密码等敏感字段（即使上游误查出来也不返回）
 * - role === 'user'：手机号必须掩码；剔除内部字段
 * - role === 'admin'：手机号明文；可保留内部字段（由上游选择性查询）
 */
function formatUserResponse(user, role = 'user') {
  if (!user || typeof user !== 'object') return user;

  const u = { ...user };

  // 强制剔除：密码相关
  const SENSITIVE_KEYS = [
    'password',
    'password_hash',
    'salt',
    'pay_password',
    'payPassword',
    '支付密码',
    'paymentPassword',
  ];
  for (const k of SENSITIVE_KEYS) {
    if (k in u) delete u[k];
  }

  if (role === 'user') {
    if (u.phone != null) u.phone = maskPhone(u.phone);

    // 普通用户不可见的内部字段（即便上游误查出来也剔除）
    const INTERNAL_KEYS = [
      'register_ip',
      'registerIp',
      'last_login_ip',
      'lastLoginIp',
      'internal_status',
      'internalStatus',
      'status_code',
      'statusCode',
      'deleted_at',
      'deletedAt',
      'deleted_by',
      'deletedBy',
      'refresh_token_version',
      'refreshTokenVersion',
      'role',
      'roleCodes',
      'permissions',
      'isSuperAdmin',
    ];
    for (const k of INTERNAL_KEYS) {
      if (k in u) delete u[k];
    }
  }

  return u;
}

module.exports = { formatUserResponse, maskPhone };

