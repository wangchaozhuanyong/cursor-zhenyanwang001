async function dropColumn(query, table, column) {
  await query(`ALTER TABLE ${table} DROP COLUMN ${column}`).catch(() => {});
}

async function dropIndex(query, table, indexName) {
  await query(`ALTER TABLE ${table} DROP KEY ${indexName}`).catch(() => {});
}

module.exports = {
  async down(query) {
    await dropIndex(query, 'coupons', 'idx_coupon_use_end');
    await dropIndex(query, 'coupons', 'idx_coupon_publish_claim');
    await dropIndex(query, 'user_coupons', 'idx_uc_order_id');
    await dropIndex(query, 'user_coupons', 'idx_uc_coupon_status');
    await dropIndex(query, 'user_coupons', 'idx_uc_user_status_valid');

    await query('DROP TABLE IF EXISTS coupon_events').catch(() => {});

    for (const column of [
      'locked_at',
      'return_reason',
      'returned_at',
      'invalid_reason',
      'discount_amount',
      'order_no',
      'order_id',
      'source_admin_id',
      'issue_activity_id',
      'issue_channel',
      'valid_until',
      'valid_from',
      'coupon_snapshot',
    ]) {
      await dropColumn(query, 'user_coupons', column);
    }

    for (const column of [
      'invalid_reason',
      'invalidated_at',
      'archived_at',
      'stop_use_at',
      'stop_claim_at',
      'issue_mode',
      'used_count',
      'claimed_count',
      'follow_activity_id',
      'valid_days_after_claim',
      'validity_mode',
      'use_end_at',
      'use_start_at',
      'claim_end_at',
      'claim_start_at',
      'publish_status',
    ]) {
      await dropColumn(query, 'coupons', column);
    }
  },
};
