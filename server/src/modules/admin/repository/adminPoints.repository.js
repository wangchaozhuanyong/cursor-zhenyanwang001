const db = require('../../../config/db');

function buildProductRuleWhere(query = {}) {
  const where = ['WHERE 1=1'];
  const params = [];
  if (query.scope_type) {
    where.push('scope_type = ?');
    params.push(query.scope_type);
  }
  if (query.scope_id) {
    where.push('scope_id = ?');
    params.push(query.scope_id);
  }
  if (query.enabled !== undefined && query.enabled !== '') {
    where.push('enabled = ?');
    params.push(query.enabled);
  }
  if (query.keyword) {
    where.push('name LIKE ?');
    params.push(`%${query.keyword}%`);
  }
  return { whereSql: where.join(' AND '), params };
}

async function selectSettings() {
  const [[row]] = await db.query('SELECT * FROM loyalty_points_settings WHERE id = 1 LIMIT 1');
  return row || null;
}

async function updateSettings(fields, values) {
  if (!fields.length) return;
  await db.query(`UPDATE loyalty_points_settings SET ${fields.join(', ')} WHERE id = 1`, values);
}

async function countProductRules(filters) {
  const { whereSql, params } = buildProductRuleWhere(filters);
  const [[{ total }]] = await db.query(`SELECT COUNT(*) AS total FROM loyalty_points_product_rules ${whereSql}`, params);
  return total;
}

async function selectProductRulesPage(filters, pageSize, offset) {
  const { whereSql, params } = buildProductRuleWhere(filters);
  const [rows] = await db.query(
    `SELECT * FROM loyalty_points_product_rules ${whereSql} ORDER BY priority ASC, updated_at DESC LIMIT ? OFFSET ?`,
    [...params, pageSize, offset],
  );
  return rows;
}

async function insertProductRule(id, input) {
  await db.query(
    `INSERT INTO loyalty_points_product_rules
      (id, name, scope_type, scope_id, priority, earn_enabled, earn_mode, fixed_points, points_percent, multiplier_percent, redeem_enabled, max_redeem_percent, start_at, end_at, enabled)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [
      id,
      input.name,
      input.scope_type,
      input.scope_id,
      input.priority,
      input.earn_enabled,
      input.earn_mode,
      input.fixed_points,
      input.points_percent,
      input.multiplier_percent,
      input.redeem_enabled,
      input.max_redeem_percent,
      input.start_at,
      input.end_at,
      input.enabled,
    ],
  );
}

async function selectProductRuleById(id) {
  const [[row]] = await db.query('SELECT * FROM loyalty_points_product_rules WHERE id = ? LIMIT 1', [id]);
  return row || null;
}

async function updateProductRule(id, input) {
  await db.query(
    `UPDATE loyalty_points_product_rules
     SET name=?, scope_type=?, scope_id=?, priority=?, earn_enabled=?, earn_mode=?, fixed_points=?, points_percent=?, multiplier_percent=?, redeem_enabled=?, max_redeem_percent=?, start_at=?, end_at=?, enabled=?
     WHERE id=?`,
    [
      input.name,
      input.scope_type,
      input.scope_id,
      input.priority,
      input.earn_enabled,
      input.earn_mode,
      input.fixed_points,
      input.points_percent,
      input.multiplier_percent,
      input.redeem_enabled,
      input.max_redeem_percent,
      input.start_at,
      input.end_at,
      input.enabled,
      id,
    ],
  );
}

async function disableProductRule(id) {
  await db.query('UPDATE loyalty_points_product_rules SET enabled = 0 WHERE id = ?', [id]);
}

module.exports = {
  selectSettings,
  updateSettings,
  countProductRules,
  selectProductRulesPage,
  insertProductRule,
  selectProductRuleById,
  updateProductRule,
  disableProductRule,
};
