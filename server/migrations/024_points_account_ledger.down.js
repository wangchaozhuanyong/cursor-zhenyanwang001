module.exports = {
  name: '024_points_account_ledger',
  async down(query) {
    await query('DROP TABLE IF EXISTS points_usage_settings');
    await query('DROP TABLE IF EXISTS points_accounts');
    try { await query('ALTER TABLE points_records DROP INDEX idx_points_related'); } catch { /* ignore */ }
    try { await query('ALTER TABLE points_records DROP INDEX idx_points_action'); } catch { /* ignore */ }
    try { await query('ALTER TABLE points_records DROP INDEX idx_points_order'); } catch { /* ignore */ }
    for (const column of ['metadata', 'operator_id', 'status', 'related_record_id', 'source_type', 'balance_after', 'balance_before', 'order_no', 'order_id']) {
      try { await query(`ALTER TABLE points_records DROP COLUMN ${column}`); } catch { /* ignore */ }
    }
  },
};
