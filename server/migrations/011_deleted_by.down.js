const TABLES = ['products', 'categories', 'coupons', 'banners', 'content_pages'];

module.exports = {
  async down(query) {
    for (const table of TABLES) {
      try { await query(`ALTER TABLE ${table} DROP COLUMN deleted_by`); } catch { /* ignore */ }
    }
  },
};
