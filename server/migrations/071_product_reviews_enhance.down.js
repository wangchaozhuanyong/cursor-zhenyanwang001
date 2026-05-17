module.exports = {
  async up(query) {
    try { await query('DROP INDEX uk_review_order_item ON product_reviews'); } catch (_) { /* ignore */ }
    try { await query('DROP INDEX idx_reviews_complaint ON product_reviews'); } catch (_) { /* ignore */ }
    const cols = [
      'order_id', 'order_item_id', 'variant_id', 'sku_text',
      'is_verified_purchase', 'complaint_status', 'complaint_note',
    ];
    for (const col of cols) {
      try { await query(`ALTER TABLE product_reviews DROP COLUMN ${col}`); } catch (_) { /* ignore */ }
    }
    const codes = ['review.view', 'review.reply', 'review.moderate', 'review.feature', 'review.delete'];
    await query(
      `DELETE FROM role_permissions WHERE permission_id IN (
        SELECT id FROM permissions WHERE code IN (${codes.map(() => '?').join(',')})
      )`,
      codes,
    );
    await query(`DELETE FROM permissions WHERE code IN (${codes.map(() => '?').join(',')})`, codes);
    await query("DELETE FROM site_settings WHERE setting_key = 'review_settings'");
  },
};
