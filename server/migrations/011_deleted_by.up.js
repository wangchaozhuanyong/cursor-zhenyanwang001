/**
 * 为已有 deleted_at 的表添加 deleted_by 字段，记录删除操作人。
 */
const TABLES = ['products', 'categories', 'coupons', 'banners', 'content_pages'];

module.exports = {
  async up(query) {
    for (const table of TABLES) {
      try {
        await query(`ALTER TABLE ${table} ADD COLUMN deleted_by VARCHAR(36) DEFAULT NULL`);
      } catch (e) {
        if (e.code !== 'ER_DUP_FIELDNAME') throw e;
      }
    }
  },
};
