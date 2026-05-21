/** 金刚区导航：支持绑定客服/APP 设置中的客服账号 */
module.exports = {
  async up(query) {
    await query(`
      ALTER TABLE home_nav_items
        ADD COLUMN target_support_channel_id VARCHAR(64) DEFAULT NULL
          COMMENT 'when target_type=support' AFTER target_category_id
    `).catch((err) => {
      if (String(err?.message || '').includes('Duplicate column')) return;
      throw err;
    });
  },
};
