const db = require('../../../config/db');

async function selectPointsSettings() {
  const [[row]] = await db.query('SELECT * FROM loyalty_points_settings WHERE id = 1 LIMIT 1');
  return row || null;
}

async function selectRewardSettings() {
  const [[row]] = await db.query('SELECT * FROM reward_usage_settings WHERE id = 1 LIMIT 1');
  return row || null;
}

async function selectProductRules(q) {
  const runner = q || db;
  const [rows] = await runner.query(
    `SELECT *
     FROM loyalty_points_product_rules
     WHERE enabled = 1
     ORDER BY priority ASC, updated_at DESC`,
  );
  return rows;
}

async function selectUserMemberLevel(q, userId) {
  if (!userId) return null;
  const runner = q || db;
  const [[row]] = await runner.query(
    `SELECT ml.id, ml.name, ml.discount_rate, ml.points_multiplier, ml.free_shipping_enabled
     FROM users u
     LEFT JOIN member_levels ml ON ml.id = u.member_level_id AND ml.enabled = 1
     WHERE u.id = ?
     LIMIT 1`,
    [userId],
  );
  return row?.id ? row : null;
}

function parseJsonArray(raw, fallback = []) {
  if (!raw) return fallback;
  if (Array.isArray(raw)) return raw;
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v) ? v : fallback;
  } catch {
    return fallback;
  }
}

module.exports = {
  selectPointsSettings,
  selectRewardSettings,
  selectProductRules,
  selectUserMemberLevel,
  parseJsonArray,
};

