async function hasColumn(query, table, column) {
  const [rows] = await query(`SHOW COLUMNS FROM ${table} LIKE ?`, [column]);
  return rows.length > 0;
}

async function dropColumn(query, table, column) {
  if (await hasColumn(query, table, column)) {
    await query(`ALTER TABLE ${table} DROP COLUMN ${column}`);
  }
}

module.exports = {
  async down(query) {
    await query('DROP TABLE IF EXISTS order_adjustment_items');
    await query('DROP TABLE IF EXISTS order_adjustments');
    await query('DROP INDEX idx_order_items_order_line_status ON order_items').catch((e) => {
      if (e.code !== 'ER_CANT_DROP_FIELD_OR_KEY') throw e;
    });
    await dropColumn(query, 'order_items', 'adjusted_reason');
    await dropColumn(query, 'order_items', 'adjusted_by');
    await dropColumn(query, 'order_items', 'adjusted_at');
    await dropColumn(query, 'order_items', 'original_qty');
    await dropColumn(query, 'order_items', 'line_status');
  },
};
