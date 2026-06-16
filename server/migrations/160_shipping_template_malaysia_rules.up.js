async function hasColumn(query, table, column) {
  const [rows] = await query(`SHOW COLUMNS FROM ${table} LIKE ?`, [column]);
  return rows.length > 0;
}

async function addColumn(query, table, column, sql) {
  if (!(await hasColumn(query, table, column))) await query(sql);
}

module.exports = {
  async up(query) {
    await addColumn(query, 'shipping_templates', 'country_code',
      "ALTER TABLE shipping_templates ADD COLUMN country_code VARCHAR(8) NOT NULL DEFAULT 'MY' COMMENT '配送国家代码' AFTER regions");
    await addColumn(query, 'shipping_templates', 'region_group',
      "ALTER TABLE shipping_templates ADD COLUMN region_group VARCHAR(32) NOT NULL DEFAULT 'all' COMMENT 'all/west_malaysia/east_malaysia/custom' AFTER country_code");
    await addColumn(query, 'shipping_templates', 'state_codes',
      "ALTER TABLE shipping_templates ADD COLUMN state_codes TEXT NULL COMMENT '适用州/联邦直辖区 JSON 数组' AFTER region_group");
    await addColumn(query, 'shipping_templates', 'city_names',
      "ALTER TABLE shipping_templates ADD COLUMN city_names TEXT NULL COMMENT '适用城市 JSON 数组' AFTER state_codes");
    await addColumn(query, 'shipping_templates', 'postcode_patterns',
      "ALTER TABLE shipping_templates ADD COLUMN postcode_patterns TEXT NULL COMMENT '适用邮编/前缀/范围 JSON 数组' AFTER city_names");
    await addColumn(query, 'shipping_templates', 'min_weight_kg',
      "ALTER TABLE shipping_templates ADD COLUMN min_weight_kg DECIMAL(10,3) NOT NULL DEFAULT 0.000 COMMENT '最小适用重量 kg' AFTER extra_per_kg");
    await addColumn(query, 'shipping_templates', 'max_weight_kg',
      "ALTER TABLE shipping_templates ADD COLUMN max_weight_kg DECIMAL(10,3) NULL COMMENT '最大适用重量 kg' AFTER min_weight_kg");
    await addColumn(query, 'shipping_templates', 'min_order_amount',
      "ALTER TABLE shipping_templates ADD COLUMN min_order_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00 COMMENT '最小适用订单金额' AFTER max_weight_kg");
    await addColumn(query, 'shipping_templates', 'max_order_amount',
      "ALTER TABLE shipping_templates ADD COLUMN max_order_amount DECIMAL(12,2) NULL COMMENT '最大适用订单金额' AFTER min_order_amount");
    await addColumn(query, 'shipping_templates', 'rule_config',
      "ALTER TABLE shipping_templates ADD COLUMN rule_config JSON NULL COMMENT '马来西亚运费规则扩展配置' AFTER max_order_amount");
  },
};
