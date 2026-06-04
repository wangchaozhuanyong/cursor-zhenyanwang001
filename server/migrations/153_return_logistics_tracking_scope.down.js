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
    await dropIndexIfExists(query, 'logistics_tracks', 'idx_logistics_direction_time');
    await dropIndexIfExists(query, 'logistics_tracks', 'idx_logistics_return_shipment');
    await dropIndexIfExists(query, 'logistics_tracks', 'idx_logistics_return_time');

    await dropColumnIfExists(query, 'logistics_tracks', 'direction');
    await dropColumnIfExists(query, 'logistics_tracks', 'return_shipment_id');
    await dropColumnIfExists(query, 'logistics_tracks', 'return_id');
  },
};
