const TABLES = ['products', 'categories', 'coupons', 'banners', 'content_pages'];

module.exports = {
  async down(query) {
    for (const table of TABLES) {
      try {
        await query(`DROP INDEX idx_${table}_deleted ON ${table}`);
      } catch { /* ignore */ }
      try {
        await query(`ALTER TABLE ${table} DROP COLUMN deleted_at`);
      } catch { /* ignore */ }
    }
  },
};
