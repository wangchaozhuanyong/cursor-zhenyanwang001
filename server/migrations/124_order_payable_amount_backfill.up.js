async function hasColumn(query, table, column) {
  const [rows] = await query(`SHOW COLUMNS FROM ${table} LIKE ?`, [column]);
  return rows.length > 0;
}

module.exports = {
  async up(query) {
    if (!(await hasColumn(query, 'orders', 'payable_amount'))) return;

    await query(`
      UPDATE orders
         SET payable_amount = COALESCE(NULLIF(payable_amount, 0), NULLIF(total_amount, 0), raw_amount, 0)
       WHERE COALESCE(payable_amount, 0) = 0
         AND COALESCE(total_amount, 0) = 0
         AND COALESCE(raw_amount, 0) > 0
    `);

    await query(`
      UPDATE orders
         SET payable_amount = COALESCE(NULLIF(payable_amount, 0), NULLIF(total_amount, 0), 0)
       WHERE COALESCE(payable_amount, 0) = 0
         AND COALESCE(total_amount, 0) > 0
    `);

    if (await hasColumn(query, 'orders', 'amount_snapshot')) {
      await query(`
        UPDATE orders
           SET payable_amount = CAST(JSON_UNQUOTE(JSON_EXTRACT(amount_snapshot, '$.payable_amount')) AS DECIMAL(12,2))
         WHERE COALESCE(payable_amount, 0) = 0
           AND COALESCE(total_amount, 0) = 0
           AND amount_snapshot IS NOT NULL
           AND CAST(JSON_UNQUOTE(JSON_EXTRACT(amount_snapshot, '$.payable_amount')) AS DECIMAL(12,2)) > 0
      `);
    }
  },
};
