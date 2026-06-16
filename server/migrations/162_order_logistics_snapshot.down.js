async function dropIndexIfExists(query, table, indexName) {
  await query(`ALTER TABLE ${table} DROP INDEX ${indexName}`).catch((err) => {
    if (err.code !== 'ER_CANT_DROP_FIELD_OR_KEY') throw err;
  });
}

async function dropColumnIfExists(query, table, column) {
  await query(`ALTER TABLE ${table} DROP COLUMN ${column}`).catch((err) => {
    if (err.code !== 'ER_CANT_DROP_FIELD_OR_KEY') throw err;
  });
}

module.exports = {
  async down(query) {
    await dropIndexIfExists(query, 'orders', 'idx_orders_logistics_snapshot');
    await dropIndexIfExists(query, 'logistics_tracks', 'idx_logistics_exception_time');

    for (const column of [
      'logistics_last_synced_at',
      'logistics_latest_event_at',
      'logistics_exception_message',
      'logistics_exception_type',
      'logistics_status_label',
      'logistics_status',
    ]) {
      await dropColumnIfExists(query, 'orders', column);
    }

    for (const column of ['severity', 'exception_type']) {
      await dropColumnIfExists(query, 'logistics_tracks', column);
    }
  },
};
