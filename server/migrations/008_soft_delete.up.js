/**
 * 为主数据表添加 deleted_at 软删除列。
 * DELETE 操作改为 UPDATE ... SET deleted_at = NOW()，SELECT 加 WHERE deleted_at IS NULL。
 */
const TABLES = ['products', 'categories', 'coupons', 'banners', 'content_pages'];

module.exports = {
  async up(query) {
    for (const table of TABLES) {
      try {
        await query(`ALTER TABLE ${table} ADD COLUMN deleted_at DATETIME DEFAULT NULL`);
      } catch (e) {
        if (e.code !== 'ER_DUP_FIELDNAME') throw e;
      }
      try {
        await query(`CREATE INDEX idx_${table}_deleted ON ${table} (deleted_at)`);
      } catch (e) {
        if (e.code !== 'ER_DUP_KEYNAME') throw e;
      }
    }
  },
};
