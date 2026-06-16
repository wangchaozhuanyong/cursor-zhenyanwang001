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
    await addColumnIfMissing(
      query,
      'orders',
      'logistics_status',
      "ALTER TABLE orders ADD COLUMN logistics_status VARCHAR(32) NOT NULL DEFAULT '' AFTER carrier",
    );
    await addColumnIfMissing(
      query,
      'orders',
      'logistics_status_label',
      "ALTER TABLE orders ADD COLUMN logistics_status_label VARCHAR(120) NOT NULL DEFAULT '' AFTER logistics_status",
    );
    await addColumnIfMissing(
      query,
      'orders',
      'logistics_exception_type',
      "ALTER TABLE orders ADD COLUMN logistics_exception_type VARCHAR(64) NOT NULL DEFAULT '' AFTER logistics_status_label",
    );
    await addColumnIfMissing(
      query,
      'orders',
      'logistics_exception_message',
      "ALTER TABLE orders ADD COLUMN logistics_exception_message VARCHAR(255) NOT NULL DEFAULT '' AFTER logistics_exception_type",
    );
    await addColumnIfMissing(
      query,
      'orders',
      'logistics_latest_event_at',
      'ALTER TABLE orders ADD COLUMN logistics_latest_event_at DATETIME NULL AFTER logistics_exception_message',
    );
    await addColumnIfMissing(
      query,
      'orders',
      'logistics_last_synced_at',
      'ALTER TABLE orders ADD COLUMN logistics_last_synced_at DATETIME NULL AFTER logistics_latest_event_at',
    );

    await addColumnIfMissing(
      query,
      'logistics_tracks',
      'exception_type',
      "ALTER TABLE logistics_tracks ADD COLUMN exception_type VARCHAR(64) NOT NULL DEFAULT '' AFTER status",
    );
    await addColumnIfMissing(
      query,
      'logistics_tracks',
      'severity',
      "ALTER TABLE logistics_tracks ADD COLUMN severity VARCHAR(16) NOT NULL DEFAULT 'info' AFTER exception_type",
    );

    await addIndexIfMissing(
      query,
      'CREATE INDEX idx_orders_logistics_snapshot ON orders (logistics_status, logistics_exception_type, logistics_latest_event_at)',
    );
    await addIndexIfMissing(
      query,
      'CREATE INDEX idx_logistics_exception_time ON logistics_tracks (exception_type, event_time)',
    );
  },
};
