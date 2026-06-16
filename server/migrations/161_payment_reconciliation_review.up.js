async function columnExists(query, table, column) {
  const [rows] = await query(`SHOW COLUMNS FROM ${table} LIKE ?`, [column]);
  return rows.length > 0;
}

async function addColumnIfMissing(query, table, column, sql) {
  if (!(await columnExists(query, table, column))) await query(sql);
}

async function addIndexIfMissing(query, sql) {
  await query(sql).catch((err) => {
    if (err.code !== 'ER_DUP_KEYNAME') throw err;
  });
}

module.exports = {
  async up(query) {
    await addColumnIfMissing(query, 'payment_events', 'failure_reason_code',
      "ALTER TABLE payment_events ADD COLUMN failure_reason_code VARCHAR(64) NOT NULL DEFAULT '' AFTER error_message");
    await addColumnIfMissing(query, 'payment_events', 'expected_amount',
      'ALTER TABLE payment_events ADD COLUMN expected_amount DECIMAL(14,2) NULL AFTER failure_reason_code');
    await addColumnIfMissing(query, 'payment_events', 'actual_amount',
      'ALTER TABLE payment_events ADD COLUMN actual_amount DECIMAL(14,2) NULL AFTER expected_amount');
    await addColumnIfMissing(query, 'payment_events', 'expected_currency',
      "ALTER TABLE payment_events ADD COLUMN expected_currency VARCHAR(8) NOT NULL DEFAULT '' AFTER actual_amount");
    await addColumnIfMissing(query, 'payment_events', 'actual_currency',
      "ALTER TABLE payment_events ADD COLUMN actual_currency VARCHAR(8) NOT NULL DEFAULT '' AFTER expected_currency");
    await addColumnIfMissing(query, 'payment_events', 'risk_level',
      "ALTER TABLE payment_events ADD COLUMN risk_level VARCHAR(8) NOT NULL DEFAULT '' AFTER actual_currency");
    await addColumnIfMissing(query, 'payment_events', 'review_status',
      "ALTER TABLE payment_events ADD COLUMN review_status VARCHAR(24) NOT NULL DEFAULT 'pending' AFTER risk_level");
    await addColumnIfMissing(query, 'payment_events', 'review_note',
      "ALTER TABLE payment_events ADD COLUMN review_note VARCHAR(512) NOT NULL DEFAULT '' AFTER review_status");
    await addColumnIfMissing(query, 'payment_events', 'reviewed_by',
      'ALTER TABLE payment_events ADD COLUMN reviewed_by VARCHAR(36) NULL AFTER review_note');
    await addColumnIfMissing(query, 'payment_events', 'reviewed_at',
      'ALTER TABLE payment_events ADD COLUMN reviewed_at DATETIME NULL AFTER reviewed_by');

    await addColumnIfMissing(query, 'payment_reconciliations', 'provider_report_amount',
      'ALTER TABLE payment_reconciliations ADD COLUMN provider_report_amount DECIMAL(14,2) NULL AFTER success_amount');
    await addColumnIfMissing(query, 'payment_reconciliations', 'provider_fee_amount',
      'ALTER TABLE payment_reconciliations ADD COLUMN provider_fee_amount DECIMAL(14,2) NOT NULL DEFAULT 0 AFTER provider_report_amount');
    await addColumnIfMissing(query, 'payment_reconciliations', 'expected_settlement_amount',
      'ALTER TABLE payment_reconciliations ADD COLUMN expected_settlement_amount DECIMAL(14,2) NOT NULL DEFAULT 0 AFTER provider_fee_amount');
    await addColumnIfMissing(query, 'payment_reconciliations', 'provider_reference',
      "ALTER TABLE payment_reconciliations ADD COLUMN provider_reference VARCHAR(128) NOT NULL DEFAULT '' AFTER diff_amount");
    await addColumnIfMissing(query, 'payment_reconciliations', 'difference_reason',
      "ALTER TABLE payment_reconciliations ADD COLUMN difference_reason VARCHAR(512) NOT NULL DEFAULT '' AFTER provider_reference");
    await addColumnIfMissing(query, 'payment_reconciliations', 'review_status',
      "ALTER TABLE payment_reconciliations ADD COLUMN review_status VARCHAR(24) NOT NULL DEFAULT 'pending' AFTER difference_reason");
    await addColumnIfMissing(query, 'payment_reconciliations', 'review_notes',
      "ALTER TABLE payment_reconciliations ADD COLUMN review_notes VARCHAR(512) NOT NULL DEFAULT '' AFTER review_status");
    await addColumnIfMissing(query, 'payment_reconciliations', 'reviewed_by',
      'ALTER TABLE payment_reconciliations ADD COLUMN reviewed_by VARCHAR(36) NULL AFTER review_notes');
    await addColumnIfMissing(query, 'payment_reconciliations', 'reviewed_at',
      'ALTER TABLE payment_reconciliations ADD COLUMN reviewed_at DATETIME NULL AFTER reviewed_by');

    await addIndexIfMissing(query, 'CREATE INDEX idx_payment_events_review ON payment_events (review_status, created_at)');
    await addIndexIfMissing(query, 'CREATE INDEX idx_payment_events_result ON payment_events (verify_status, processing_result, created_at)');
    await addIndexIfMissing(query, 'CREATE INDEX idx_payment_recon_review ON payment_reconciliations (review_status, reconcile_date)');
    await addIndexIfMissing(query, 'CREATE INDEX idx_payment_recon_status ON payment_reconciliations (status, reconcile_date)');

    const channels = [
      ['ch_billplz_fpx', 'billplz_fpx', 'Billplz / FPX', 'billplz', 'MY', 'MYR', 8, 0, 'sandbox', JSON.stringify({
        method: 'fpx',
        gateway_url_template: '',
        bill_url_template: '',
      })],
      ['ch_direct_fpx', 'direct_fpx', 'FPX Direct', 'fpx', 'MY', 'MYR', 9, 0, 'sandbox', JSON.stringify({
        method: 'fpx',
        gateway_url_template: '',
        bill_url_template: '',
      })],
    ];
    for (const row of channels) {
      await query(
        `INSERT IGNORE INTO payment_channels
         (id, code, name, provider, country_code, currency, sort_order, enabled, environment, config_json)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        row,
      );
    }
  },
};
