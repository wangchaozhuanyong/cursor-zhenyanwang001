/**
 * RBAC：permissions / roles / role_permissions / user_roles
 * 兼容 users.role：super_admin → super_admin 角色，admin → admin_manager 角色
 */
const PERMISSIONS = [
  ['dashboard.view', '仪表盘'],
  ['report.view', '报表查看'],
  ['report.export', '报表导出'],
  ['order.view', '订单查看'],
  ['order.update', '订单状态'],
  ['order.ship', '订单发货'],
  ['user.view', '用户查看'],
  ['user.update', '用户编辑'],
  ['user.points', '积分调整'],
  ['product.view', '商品查看'],
  ['product.manage', '商品维护'],
  ['category.manage', '分类管理'],
  ['tag.manage', '标签管理'],
  ['coupon.view', '优惠券查看'],
  ['coupon.manage', '优惠券维护'],
  ['return.view', '售后查看'],
  ['return.handle', '售后处理'],
  ['notification.manage', '通知管理'],
  ['banner.manage', 'Banner管理'],
  ['invite.view', '邀请查看'],
  ['referral.manage', '返现规则'],
  ['points.manage', '积分规则'],
  ['shipping.manage', '运费规则'],
  ['settings.manage', '站点设置'],
  ['content.manage', '内容管理'],
  ['audit.view', '审计日志'],
  ['admin_log.view', '操作日志'],
  ['role.manage', '角色权限'],
];

const ROLES = [
  ['super_admin', '超级管理员', 1],
  ['admin_manager', '系统管理员', 1],
  ['operator', '运营', 1],
  ['customer_service', '客服', 1],
  ['warehouse', '仓储', 1],
  ['finance', '财务', 1],
  ['content_editor', '内容编辑', 1],
];

/** 各预置角色拥有的权限 code（super_admin / admin_manager 在代码中用全量插入） */
const ROLE_PERM_CODES = {
  operator: [
    'dashboard.view',
    'product.view',
    'product.manage',
    'category.manage',
    'tag.manage',
    'order.view',
    'order.update',
    'order.ship',
    'return.view',
    'return.handle',
    'user.view',
    'coupon.view',
    'coupon.manage',
    'notification.manage',
    'banner.manage',
    'invite.view',
    'referral.manage',
    'points.manage',
    'shipping.manage',
    'settings.manage',
    'content.manage',
    'audit.view',
  ],
  customer_service: [
    'dashboard.view',
    'order.view',
    'order.update',
    'user.view',
    'return.view',
    'return.handle',
    'coupon.view',
  ],
  warehouse: ['dashboard.view', 'order.view', 'order.ship'],
  finance: ['dashboard.view', 'report.view', 'report.export', 'order.view', 'user.view', 'audit.view'],
  content_editor: ['dashboard.view', 'content.manage', 'banner.manage', 'notification.manage'],
};

module.exports = {
  async up(query) {
    await query(`
      CREATE TABLE IF NOT EXISTS permissions (
        id           INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        code         VARCHAR(64)  NOT NULL,
        name         VARCHAR(100) NOT NULL DEFAULT '',
        sort_order   INT          NOT NULL DEFAULT 0,
        created_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uk_perm_code (code)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS roles (
        id           INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        code         VARCHAR(64)  NOT NULL,
        name         VARCHAR(100) NOT NULL DEFAULT '',
        description  VARCHAR(255) NOT NULL DEFAULT '',
        is_system    TINYINT(1)   NOT NULL DEFAULT 0,
        created_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uk_role_code (code)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS role_permissions (
        role_id       INT UNSIGNED NOT NULL,
        permission_id INT UNSIGNED NOT NULL,
        PRIMARY KEY (role_id, permission_id),
        CONSTRAINT fk_rp_role FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
        CONSTRAINT fk_rp_perm FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS user_roles (
        user_id  VARCHAR(36) NOT NULL,
        role_id  INT UNSIGNED NOT NULL,
        PRIMARY KEY (user_id, role_id),
        CONSTRAINT fk_ur_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        CONSTRAINT fk_ur_role FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    for (let i = 0; i < PERMISSIONS.length; i += 1) {
      const [code, name] = PERMISSIONS[i];
      await query(
        `INSERT IGNORE INTO permissions (code, name, sort_order) VALUES (?, ?, ?)`,
        [code, name, i],
      );
    }

    for (const [code, name, isSystem] of ROLES) {
      await query(`INSERT IGNORE INTO roles (code, name, is_system) VALUES (?, ?, ?)`, [code, name, isSystem]);
    }

    const allCodes = PERMISSIONS.map((p) => p[0]);
    for (const code of ['super_admin', 'admin_manager']) {
      await query(
        `
        INSERT IGNORE INTO role_permissions (role_id, permission_id)
        SELECT r.id, p.id
        FROM roles r
        CROSS JOIN permissions p
        WHERE r.code = ?
        `,
        [code],
      );
    }

    for (const [roleCode, codes] of Object.entries(ROLE_PERM_CODES)) {
      const placeholders = codes.map(() => '?').join(',');
      await query(
        `
        INSERT IGNORE INTO role_permissions (role_id, permission_id)
        SELECT r.id, p.id
        FROM roles r
        JOIN permissions p ON p.code IN (${placeholders})
        WHERE r.code = ?
        `,
        [...codes, roleCode],
      );
    }

    await query(`
      INSERT IGNORE INTO user_roles (user_id, role_id)
      SELECT u.id, r.id
      FROM users u
      JOIN roles r ON r.code = 'super_admin'
      WHERE u.role = 'super_admin'
    `);

    await query(`
      INSERT IGNORE INTO user_roles (user_id, role_id)
      SELECT u.id, r.id
      FROM users u
      JOIN roles r ON r.code = 'admin_manager'
      WHERE u.role = 'admin'
    `);
  },
};
