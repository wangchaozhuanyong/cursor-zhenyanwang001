module.exports = {
  async up(query) {
    await query(`
      CREATE TABLE IF NOT EXISTS member_levels (
        id VARCHAR(36) NOT NULL PRIMARY KEY,
        name VARCHAR(50) NOT NULL,
        description VARCHAR(255) NOT NULL DEFAULT '',
        min_spent DECIMAL(12,2) NOT NULL DEFAULT 0 COMMENT '累计已支付消费门槛',
        min_orders INT NOT NULL DEFAULT 0 COMMENT '累计已支付订单数门槛',
        sort_order INT NOT NULL DEFAULT 0,
        enabled TINYINT(1) NOT NULL DEFAULT 1,
        is_default TINYINT(1) NOT NULL DEFAULT 0,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uk_member_level_name (name),
        KEY idx_member_level_rule (enabled, min_spent, min_orders, sort_order)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await query(`
      INSERT INTO member_levels (id, name, description, min_spent, min_orders, sort_order, enabled, is_default)
      VALUES
        ('level_basic', '普通会员', '注册后默认会员等级', 0, 0, 0, 1, 1),
        ('level_silver', '白银会员', '累计消费 RM 500 或完成 3 笔订单后可升级', 500, 3, 10, 1, 0),
        ('level_gold', '黄金会员', '累计消费 RM 1500 或完成 8 笔订单后可升级', 1500, 8, 20, 1, 0),
        ('level_diamond', '钻石会员', '累计消费 RM 5000 或完成 20 笔订单后可升级', 5000, 20, 30, 1, 0)
      ON DUPLICATE KEY UPDATE
        description = VALUES(description),
        min_spent = VALUES(min_spent),
        min_orders = VALUES(min_orders),
        sort_order = VALUES(sort_order),
        enabled = VALUES(enabled),
        is_default = VALUES(is_default)
    `);

    await query(`
      ALTER TABLE users
      ADD COLUMN member_level_id VARCHAR(36) DEFAULT NULL COMMENT '当前会员等级'
      AFTER points_balance
    `).catch((e) => {
      if (e.code !== 'ER_DUP_FIELDNAME') throw e;
    });

    await query(`
      ALTER TABLE users
      ADD KEY idx_users_member_level (member_level_id)
    `).catch((e) => {
      if (e.code !== 'ER_DUP_KEYNAME') throw e;
    });

    await query(`
      UPDATE users
      SET member_level_id = 'level_basic'
      WHERE member_level_id IS NULL OR member_level_id = ''
    `);

    await query(`
      INSERT IGNORE INTO permissions (code, name, sort_order)
      VALUES ('member_level.manage', '会员等级管理', 113)
    `).catch(() => {});

    for (const roleCode of ['super_admin', 'admin_manager', 'operator']) {
      await query(
        `INSERT IGNORE INTO role_permissions (role_id, permission_id)
         SELECT r.id, p.id
         FROM roles r
         JOIN permissions p ON p.code = 'member_level.manage'
         WHERE r.code = ?`,
        [roleCode],
      ).catch(() => {});
    }
  },
};
