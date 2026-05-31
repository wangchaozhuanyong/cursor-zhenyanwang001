const db = require('../../../config/db');

function parseJson(value, fallback) {
  if (value == null || value === '') return fallback;
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function listWhere(query = {}) {
  const where = ['cc.deleted_at IS NULL'];
  const params = [];
  const keyword = String(query.keyword || query.search || '').trim();
  if (keyword) {
    where.push('(cc.title LIKE ? OR cc.subtitle LIKE ?)');
    params.push(`%${keyword}%`, `%${keyword}%`);
  }
  const type = String(query.campaign_type || query.type || '').trim();
  if (type) {
    where.push('cc.campaign_type = ?');
    params.push(type);
  }
  const status = String(query.status || '').trim();
  if (status === 'disabled') {
    where.push("(cc.disabled = 1 OR cc.status = 'disabled')");
  } else if (status === 'draft') {
    where.push("cc.status = 'draft'");
  } else if (status === 'scheduled') {
    where.push("cc.disabled = 0 AND cc.status NOT IN ('draft','disabled') AND cc.start_at > NOW()");
  } else if (status === 'active') {
    where.push("cc.disabled = 0 AND cc.status NOT IN ('draft','disabled') AND cc.start_at <= NOW() AND cc.end_at >= NOW()");
  } else if (status === 'ended') {
    where.push('cc.end_at < NOW()');
  }
  return { whereSql: where.join(' AND '), params };
}

async function countCampaigns(query = {}) {
  const { whereSql, params } = listWhere(query);
  const [[row]] = await db.query(`SELECT COUNT(*) AS total FROM coupon_campaigns cc WHERE ${whereSql}`, params);
  return Number(row?.total || 0);
}

async function selectCampaignsPage(pageSize, offset, query = {}) {
  const { whereSql, params } = listWhere(query);
  const [rows] = await db.query(
    `SELECT cc.*,
            COUNT(DISTINCT cci.coupon_id) AS coupon_count,
            COALESCE(SUM(c.claimed_count), 0) AS claimed_count,
            COALESCE(SUM(c.used_count), 0) AS used_count
       FROM coupon_campaigns cc
       LEFT JOIN coupon_campaign_items cci ON cci.campaign_id = cc.id
       LEFT JOIN coupons c ON BINARY c.id = BINARY cci.coupon_id
      WHERE ${whereSql}
      GROUP BY cc.id
      ORDER BY cc.sort_order ASC, cc.created_at DESC
      LIMIT ? OFFSET ?`,
    [...params, pageSize, offset],
  );
  return rows;
}

async function selectCampaignById(id) {
  const [[row]] = await db.query(
    'SELECT * FROM coupon_campaigns WHERE BINARY id = BINARY ? AND deleted_at IS NULL',
    [id],
  );
  return row || null;
}

async function selectCampaignItems(campaignId) {
  const [rows] = await db.query(
    `SELECT cci.id, cci.campaign_id, cci.coupon_id, cci.sort_order,
            c.title AS coupon_title, c.code AS coupon_code, c.type AS coupon_type,
            c.value AS coupon_value, c.min_amount AS coupon_min_amount,
            c.publish_status AS coupon_publish_status, c.status AS coupon_status
       FROM coupon_campaign_items cci
       JOIN coupons c ON BINARY c.id = BINARY cci.coupon_id
      WHERE BINARY cci.campaign_id = BINARY ?
      ORDER BY cci.sort_order ASC, cci.created_at ASC`,
    [campaignId],
  );
  return rows;
}

async function selectCampaignAudiences(campaignId) {
  const [rows] = await db.query(
    `SELECT id, campaign_id, scope_type, scope_id
       FROM coupon_campaign_audiences
      WHERE BINARY campaign_id = BINARY ?
      ORDER BY created_at ASC`,
    [campaignId],
  );
  return rows;
}

async function insertCampaign(row) {
  await db.query(
    `INSERT INTO coupon_campaigns
      (id, campaign_type, title, subtitle, description, cover_image, start_at, end_at,
       status, disabled, display_positions, audience_type, audience_config, issue_mode,
       sort_order, internal_note, created_by, updated_by)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [
      row.id,
      row.campaign_type,
      row.title,
      row.subtitle || '',
      row.description || '',
      row.cover_image || '',
      row.start_at,
      row.end_at,
      row.status || 'draft',
      row.disabled ? 1 : 0,
      JSON.stringify(row.display_positions || []),
      row.audience_type || 'all',
      row.audience_config ? JSON.stringify(row.audience_config) : null,
      row.issue_mode || 'self_claim',
      Number(row.sort_order || 0),
      row.internal_note || '',
      row.adminUserId || null,
      row.adminUserId || null,
    ],
  );
}

async function updateCampaignDynamic(id, fragments, values, adminUserId) {
  await db.query(
    `UPDATE coupon_campaigns SET ${fragments.join(', ')}, updated_by = ? WHERE BINARY id = BINARY ? AND deleted_at IS NULL`,
    [...values, adminUserId || null, id],
  );
}

async function replaceCampaignItems(campaignId, couponIds = []) {
  const ids = [...new Set(couponIds.map((id) => String(id || '').trim()).filter(Boolean))];
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    await conn.query('DELETE FROM coupon_campaign_items WHERE BINARY campaign_id = BINARY ?', [campaignId]);
    for (const [index, couponId] of ids.entries()) {
      await conn.query(
        `INSERT IGNORE INTO coupon_campaign_items (id, campaign_id, coupon_id, sort_order)
         VALUES (UUID(),?,?,?)`,
        [campaignId, couponId, index],
      );
    }
    await conn.commit();
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
}

async function replaceCampaignAudiences(campaignId, audienceType, scopeIds = []) {
  const ids = [...new Set(scopeIds.map((id) => String(id || '').trim()).filter(Boolean))];
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    await conn.query('DELETE FROM coupon_campaign_audiences WHERE BINARY campaign_id = BINARY ?', [campaignId]);
    if (ids.length) {
      for (const scopeId of ids) {
        await conn.query(
          `INSERT IGNORE INTO coupon_campaign_audiences (id, campaign_id, scope_type, scope_id)
           VALUES (UUID(),?,?,?)`,
          [campaignId, audienceType || 'all', scopeId],
        );
      }
    } else {
      await conn.query(
        `INSERT IGNORE INTO coupon_campaign_audiences (id, campaign_id, scope_type, scope_id)
         VALUES (UUID(),?,?,?)`,
        [campaignId, audienceType || 'all', ''],
      );
    }
    await conn.commit();
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
}

async function softDeleteCampaign(id, adminUserId) {
  await db.query(
    "UPDATE coupon_campaigns SET deleted_at = NOW(), deleted_by = ?, disabled = 1, status = 'disabled' WHERE BINARY id = BINARY ?",
    [adminUserId || null, id],
  );
}

async function selectPublicCampaignsByPosition(position, types = []) {
  const pos = String(position || 'home_coupon_zone').trim();
  const typeFilter = types.length ? `AND cc.campaign_type IN (${types.map(() => '?').join(',')})` : '';
  const params = [pos, ...types];
  const [rows] = await db.query(
    `SELECT cc.*
       FROM coupon_campaigns cc
      WHERE cc.deleted_at IS NULL
        AND cc.disabled = 0
        AND cc.status NOT IN ('draft','disabled')
        AND cc.start_at <= NOW()
        AND cc.end_at >= NOW()
        AND JSON_CONTAINS(COALESCE(cc.display_positions, '[]'), JSON_QUOTE(?), '$')
        ${typeFilter}
      ORDER BY cc.sort_order ASC, cc.start_at DESC`,
    params,
  );
  return rows.map((row) => ({
    ...row,
    display_positions: parseJson(row.display_positions, []),
    audience_config: parseJson(row.audience_config, null),
  }));
}

async function selectCouponIdsByCampaignId(campaignId) {
  const [rows] = await db.query(
    `SELECT coupon_id
       FROM coupon_campaign_items
      WHERE BINARY campaign_id = BINARY ?
      ORDER BY sort_order ASC, created_at ASC`,
    [campaignId],
  );
  return rows.map((row) => row.coupon_id).filter(Boolean);
}

module.exports = {
  parseJson,
  countCampaigns,
  selectCampaignsPage,
  selectCampaignById,
  selectCampaignItems,
  selectCampaignAudiences,
  insertCampaign,
  updateCampaignDynamic,
  replaceCampaignItems,
  replaceCampaignAudiences,
  softDeleteCampaign,
  selectPublicCampaignsByPosition,
  selectCouponIdsByCampaignId,
};
