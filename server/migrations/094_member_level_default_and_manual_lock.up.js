module.exports = {
  async up(query) {
    await query(`
      ALTER TABLE users
      ADD COLUMN member_level_manual_locked TINYINT(1) NOT NULL DEFAULT 0
      COMMENT '管理员手动指定会员等级后锁定，自动重算默认不覆盖'
      AFTER member_level_id
    `).catch((e) => {
      if (e.code !== 'ER_DUP_FIELDNAME') throw e;
    });

    await query(`
      ALTER TABLE users
      ADD COLUMN member_level_manual_reason VARCHAR(255) NULL
      AFTER member_level_manual_locked
    `).catch((e) => {
      if (e.code !== 'ER_DUP_FIELDNAME') throw e;
    });

    await query(`
      ALTER TABLE users
      ADD COLUMN member_level_manual_at DATETIME NULL
      AFTER member_level_manual_reason
    `).catch((e) => {
      if (e.code !== 'ER_DUP_FIELDNAME') throw e;
    });

    await query(`
      UPDATE users u
      JOIN (
        SELECT id
        FROM member_levels
        WHERE enabled = 1
        ORDER BY is_default DESC, sort_order ASC, min_spent ASC, min_orders ASC, created_at ASC
        LIMIT 1
      ) d
      SET u.member_level_id = d.id
      WHERE u.deleted_at IS NULL
        AND (u.member_level_id IS NULL OR u.member_level_id = '')
    `).catch(() => {});
  },
};
