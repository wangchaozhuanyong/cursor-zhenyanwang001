module.exports = {
  async up(query) {
    const [[row]] = await query(`
      SELECT COUNT(*) AS cnt
      FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'users'
        AND COLUMN_NAME = 'admin_order_voice_enabled'
    `);
    if (Number(row?.cnt) > 0) return;

    await query(`
      ALTER TABLE users
        ADD COLUMN admin_order_voice_enabled TINYINT(1) NOT NULL DEFAULT 0
        COMMENT '管理员订单语音提醒开关'
        AFTER role
    `);
  },
};
