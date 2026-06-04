async function columnExists(query, table, column) {
  const [rows] = await query(
    `SELECT COUNT(*) AS total
       FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = ?
        AND COLUMN_NAME = ?`,
    [table, column],
  );
  return Number(rows?.[0]?.total || 0) > 0;
}

async function dropColumnIfExists(query, table, column) {
  if (!(await columnExists(query, table, column))) return;
  await query(`ALTER TABLE ${table} DROP COLUMN ${column}`);
}

module.exports = {
  async down(query) {
    await query('DROP TABLE IF EXISTS return_shipments');
    await query('DROP TABLE IF EXISTS return_events');
    await dropColumnIfExists(query, 'return_requests', 'updated_at');
    await dropColumnIfExists(query, 'return_requests', 'contact_phone');
    await dropColumnIfExists(query, 'return_requests', 'admin_remark');
    await dropColumnIfExists(query, 'return_requests', 'refund_amount');
  },
};
