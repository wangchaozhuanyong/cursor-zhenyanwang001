async function columnExists(query, table, column) {
  const [rows] = await query(`SHOW COLUMNS FROM ${table} LIKE ?`, [column]);
  return rows.length > 0;
}

async function dropIndexIfExists(query, table, indexName) {
  await query(`ALTER TABLE ${table} DROP INDEX ${indexName}`).catch((err) => {
    if (err.code !== 'ER_CANT_DROP_FIELD_OR_KEY') throw err;
  });
}

async function dropColumnIfExists(query, table, column) {
  if (await columnExists(query, table, column)) {
    await query(`ALTER TABLE ${table} DROP COLUMN ${column}`);
  }
}

module.exports = {
  async down(query) {
    await query("DELETE FROM payment_channels WHERE id IN ('ch_billplz_fpx', 'ch_direct_fpx') AND code IN ('billplz_fpx', 'direct_fpx')");

    await dropIndexIfExists(query, 'payment_reconciliations', 'idx_payment_recon_status');
    await dropIndexIfExists(query, 'payment_reconciliations', 'idx_payment_recon_review');
    await dropIndexIfExists(query, 'payment_events', 'idx_payment_events_result');
    await dropIndexIfExists(query, 'payment_events', 'idx_payment_events_review');

    for (const column of [
      'reviewed_at',
      'reviewed_by',
      'review_notes',
      'review_status',
      'difference_reason',
      'provider_reference',
      'expected_settlement_amount',
      'provider_fee_amount',
      'provider_report_amount',
    ]) {
      await dropColumnIfExists(query, 'payment_reconciliations', column);
    }

    for (const column of [
      'reviewed_at',
      'reviewed_by',
      'review_note',
      'review_status',
      'risk_level',
      'actual_currency',
      'expected_currency',
      'actual_amount',
      'expected_amount',
      'failure_reason_code',
    ]) {
      await dropColumnIfExists(query, 'payment_events', column);
    }
  },
};
