async function hasColumn(query, table, column) {
  const [rows] = await query(`SHOW COLUMNS FROM ${table} LIKE ?`, [column]);
  return rows.length > 0;
}

async function dropColumn(query, table, column) {
  if (await hasColumn(query, table, column)) await query(`ALTER TABLE ${table} DROP COLUMN ${column}`);
}

module.exports = {
  async down(query) {
    for (const column of [
      'rule_config',
      'max_order_amount',
      'min_order_amount',
      'max_weight_kg',
      'min_weight_kg',
      'postcode_patterns',
      'city_names',
      'state_codes',
      'region_group',
      'country_code',
    ]) {
      await dropColumn(query, 'shipping_templates', column);
    }
  },
};
