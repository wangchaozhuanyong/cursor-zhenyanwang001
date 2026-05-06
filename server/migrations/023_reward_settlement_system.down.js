module.exports = {
  name: '023_reward_settlement_system',
  async down(query) {
    await query('DROP TABLE IF EXISTS reward_transactions');
    try { await query('ALTER TABLE reward_records DROP INDEX uk_reward_settle_once'); } catch { /* ignore */ }
    try { await query('ALTER TABLE reward_records DROP INDEX idx_reward_order'); } catch { /* ignore */ }
    try { await query('ALTER TABLE reward_records DROP INDEX idx_reward_status'); } catch { /* ignore */ }
    for (const column of ['reversed_at', 'paid_at', 'approved_at', 'metadata', 'remark', 'related_record_id', 'source_type', 'order_amount', 'level']) {
      try { await query(`ALTER TABLE reward_records DROP COLUMN ${column}`); } catch { /* ignore */ }
    }
  },
};
