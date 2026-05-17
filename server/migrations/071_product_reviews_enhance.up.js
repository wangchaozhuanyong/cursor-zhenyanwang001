/**
 * 评论增强：订单绑定、差评处理、拆分权限
 */
module.exports = {
  async up(query) {
    const cols = [
      { sql: 'ALTER TABLE product_reviews ADD COLUMN order_id VARCHAR(36) DEFAULT NULL', err: 'ER_DUP_FIELDNAME' },
      { sql: 'ALTER TABLE product_reviews ADD COLUMN order_item_id VARCHAR(36) DEFAULT NULL', err: 'ER_DUP_FIELDNAME' },
      { sql: 'ALTER TABLE product_reviews ADD COLUMN variant_id VARCHAR(36) DEFAULT NULL', err: 'ER_DUP_FIELDNAME' },
      { sql: 'ALTER TABLE product_reviews ADD COLUMN sku_text VARCHAR(255) DEFAULT NULL', err: 'ER_DUP_FIELDNAME' },
      { sql: 'ALTER TABLE product_reviews ADD COLUMN is_verified_purchase TINYINT(1) NOT NULL DEFAULT 0', err: 'ER_DUP_FIELDNAME' },
      { sql: "ALTER TABLE product_reviews ADD COLUMN complaint_status VARCHAR(32) NOT NULL DEFAULT 'none'", err: 'ER_DUP_FIELDNAME' },
      { sql: 'ALTER TABLE product_reviews ADD COLUMN complaint_note TEXT DEFAULT NULL', err: 'ER_DUP_FIELDNAME' },
    ];
    for (const c of cols) {
      try { await query(c.sql); } catch (e) { if (e.code !== c.err) throw e; }
    }

    try {
      await query('CREATE UNIQUE INDEX uk_review_order_item ON product_reviews (order_item_id)');
    } catch (e) {
      if (e.code !== 'ER_DUP_KEYNAME') throw e;
    }
    try {
      await query('CREATE INDEX idx_reviews_complaint ON product_reviews (complaint_status)');
    } catch (e) {
      if (e.code !== 'ER_DUP_KEYNAME') throw e;
    }

    const perms = [
      ['review.view', '查看评论', 100],
      ['review.reply', '官方回复', 101],
      ['review.moderate', '审核评论', 102],
      ['review.feature', '精选评论', 103],
      ['review.delete', '删除评论', 104],
    ];
    for (const [code, name, sort] of perms) {
      await query(
        'INSERT IGNORE INTO permissions (code, name, sort_order) VALUES (?, ?, ?)',
        [code, name, sort],
      );
    }

    for (const roleCode of ['super_admin', 'admin_manager']) {
      await query(
        `INSERT IGNORE INTO role_permissions (role_id, permission_id)
         SELECT r.id, p.id FROM roles r
         CROSS JOIN permissions p
         WHERE r.code = ? AND p.code IN (
           'review.view','review.reply','review.moderate','review.feature','review.delete','review.manage'
         )`,
        [roleCode],
      );
    }

    await query(
      `INSERT IGNORE INTO role_permissions (role_id, permission_id)
       SELECT r.id, p.id FROM roles r
       CROSS JOIN permissions p
       WHERE r.code = 'operator' AND p.code IN (
         'review.view','review.reply','review.moderate','review.feature','review.delete','review.manage'
       )`,
    );

    await query(
      `INSERT IGNORE INTO role_permissions (role_id, permission_id)
       SELECT DISTINCT rp.role_id, p2.id
       FROM role_permissions rp
       JOIN permissions p ON p.id = rp.permission_id AND p.code = 'review.manage'
       CROSS JOIN permissions p2
       WHERE p2.code IN (
         'review.view','review.reply','review.moderate','review.feature','review.delete'
       )`,
    );

    await query(
      `INSERT IGNORE INTO site_settings (setting_key, setting_value) VALUES (
        'review_settings',
        '{"auto_approve":true,"sensitive_words":["微信","二维码","假货","骗子","投诉"]}'
      )`,
    );
  },
};
