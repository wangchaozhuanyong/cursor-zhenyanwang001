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
      'logistics_tracks',
      'return_id',
      'ALTER TABLE logistics_tracks ADD COLUMN return_id VARCHAR(36) NULL AFTER order_id',
    );
    await addColumnIfMissing(
      query,
      'logistics_tracks',
      'return_shipment_id',
      'ALTER TABLE logistics_tracks ADD COLUMN return_shipment_id VARCHAR(36) NULL AFTER return_id',
    );
    await addColumnIfMissing(
      query,
      'logistics_tracks',
      'direction',
      "ALTER TABLE logistics_tracks ADD COLUMN direction VARCHAR(32) NOT NULL DEFAULT 'order_shipping' AFTER return_shipment_id",
    );

    await addIndexIfMissing(
      query,
      'CREATE INDEX idx_logistics_return_time ON logistics_tracks (return_id, event_time)',
    );
    await addIndexIfMissing(
      query,
      'CREATE INDEX idx_logistics_return_shipment ON logistics_tracks (return_shipment_id)',
    );
    await addIndexIfMissing(
      query,
      'CREATE INDEX idx_logistics_direction_time ON logistics_tracks (direction, event_time)',
    );
  },
};
