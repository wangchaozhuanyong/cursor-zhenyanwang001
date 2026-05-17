const db = require('../../config/db');

async function selectPointsSettings() {
  const [[row]] = await db.query('SELECT * FROM loyalty_points_settings WHERE id = 1 LIMIT 1');
  return row || null;
}

async function selectRewardSettings() {
  const [[row]] = await db.query('SELECT * FROM reward_usage_settings WHERE id = 1 LIMIT 1');
  return row || null;
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
  parseJsonArray,
};

