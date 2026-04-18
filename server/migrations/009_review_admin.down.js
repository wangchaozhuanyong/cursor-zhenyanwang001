module.exports = {
  async down(query) {
    try { await query("DROP INDEX idx_reviews_deleted ON product_reviews"); } catch { /* ignore */ }
    try { await query("DROP INDEX idx_reviews_status ON product_reviews"); } catch { /* ignore */ }
    for (const col of ['deleted_by', 'deleted_at', 'admin_reply_at', 'admin_reply', 'status']) {
      try { await query(`ALTER TABLE product_reviews DROP COLUMN ${col}`); } catch { /* ignore */ }
    }
  },
};
