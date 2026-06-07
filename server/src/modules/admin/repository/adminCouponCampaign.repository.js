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

function normalizeCampaignRow(row) {
  return {
    ...row,
    display_positions: parseJson(row.display_positions, []),
    audience_config: parseJson(row.audience_config, null),
  };
}

async function selectCampaignAudiencesByIds(campaignIds = []) {
  const ids = [...new Set(campaignIds.map((id) => String(id || '').trim()).filter(Boolean))];
  if (!ids.length) return new Map();
  const placeholders = ids.map(() => '?').join(',');
  const [rows] = await db.query(
    `SELECT campaign_id, scope_type, scope_id
       FROM coupon_campaign_audiences
      WHERE campaign_id IN (${placeholders})`,
    ids,
  );
  const map = new Map();
  for (const row of rows) {
    const campaignId = String(row.campaign_id || '');
    if (!map.has(campaignId)) map.set(campaignId, []);
    map.get(campaignId).push(row);
  }
  return map;
}

async function selectUserAudienceContext(userId) {
  const id = String(userId || '').trim();
  if (!id) {
    return { authenticated: false, orderCount: 0, memberLevelId: '', tagIds: new Set() };
  }
  const [[user]] = await db.query(
    `SELECT u.id, u.member_level_id,
            (
              SELECT COUNT(*)
                FROM orders o
               WHERE BINARY o.user_id = BINARY u.id
                 AND o.status NOT IN ('cancelled')
            ) AS order_count
       FROM users u
      WHERE BINARY u.id = BINARY ?
        AND u.deleted_at IS NULL
      LIMIT 1`,
    [id],
  );
  if (!user) {
    return { authenticated: false, orderCount: 0, memberLevelId: '', tagIds: new Set() };
  }
  const [tagRows] = await db.query(
    'SELECT tag_id FROM user_tag_assignments WHERE BINARY user_id = BINARY ?',
    [id],
  );
  return {
    authenticated: true,
    orderCount: Number(user.order_count || 0),
    memberLevelId: String(user.member_level_id || ''),
    tagIds: new Set(tagRows.map((row) => String(row.tag_id || '')).filter(Boolean)),
  };
}

function audienceScopeIds(campaign, rows = []) {
  const fromRows = rows.map((row) => String(row.scope_id || '').trim()).filter(Boolean);
  if (fromRows.length) return fromRows;
  const config = campaign?.audience_config || {};
  const keys = ['scope_ids', 'scopeIds', 'member_level_ids', 'memberLevelIds', 'user_tag_ids', 'userTagIds'];
  const ids = [];
  for (const key of keys) {
    if (Array.isArray(config[key])) ids.push(...config[key]);
  }
  return [...new Set(ids.map((id) => String(id || '').trim()).filter(Boolean))];
}

function campaignMatchesAudience(campaign, audienceRows = [], context) {
  const type = String(campaign?.audience_type || audienceRows[0]?.scope_type || 'all');
  if (type === 'all') return true;
  if (type === 'new_user') {
    // 未登录用户也允许看到新人礼，用它引导注册；真正领取/发放时后端还会校验。
    return !context.authenticated || context.orderCount <= 0;
  }
  if (!context.authenticated) return false;
  if (type === 'old_user') return context.orderCount > 0;
  const scopeIds = audienceScopeIds(campaign, audienceRows);
  if (type === 'member_level') return !!context.memberLevelId && scopeIds.includes(context.memberLevelId);
  if (type === 'user_tag') return scopeIds.some((id) => context.tagIds.has(id));
  return false;
}

async function filterCampaignsForAudience(campaigns = [], userId = null) {
  if (!campaigns.length) return [];
  const audienceMap = await selectCampaignAudiencesByIds(campaigns.map((row) => row.id));
  const context = await selectUserAudienceContext(userId);
  return campaigns.filter((campaign) => (
    campaignMatchesAudience(campaign, audienceMap.get(String(campaign.id)) || [], context)
  ));
}

async function selectPublicCampaignsByPosition(position, types = [], options = {}) {
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
  const campaigns = rows.map(normalizeCampaignRow);
  return filterCampaignsForAudience(campaigns, options.userId || null);
}

async function isCouponCampaignClaimAllowed(campaignId, couponId, userId) {
  const resolved = await resolveCouponCampaignClaim(campaignId, couponId, userId);
  return !!resolved;
}

async function selectActiveCampaignsForCoupon(couponId, campaignId = '', manualOnly = true) {
  const cid = String(couponId || '').trim();
  const id = String(campaignId || '').trim();
  if (!cid) return [];
  const campaignFilter = id ? 'AND BINARY cc.id = BINARY ?' : '';
  const issueModeFilter = manualOnly
    ? "AND COALESCE(cc.issue_mode, 'self_claim') IN ('self_claim','code_redeem')"
    : '';
  const params = id ? [cid, id] : [cid];
  const [rows] = await db.query(
    `SELECT cc.*
       FROM coupon_campaigns cc
       INNER JOIN coupon_campaign_items cci ON BINARY cci.campaign_id = BINARY cc.id
      WHERE BINARY cci.coupon_id = BINARY ?
        ${campaignFilter}
        AND cc.deleted_at IS NULL
        AND cc.disabled = 0
        AND cc.status NOT IN ('draft','disabled')
        AND cc.start_at <= NOW()
        AND cc.end_at >= NOW()
        ${issueModeFilter}
      ORDER BY cc.sort_order ASC, cc.start_at DESC`,
    params,
  );
  return rows.map(normalizeCampaignRow);
}

async function resolveCouponCampaignClaim(campaignId, couponId, userId) {
  const cid = String(couponId || '').trim();
  if (!cid || !userId) return null;
  const campaigns = await selectActiveCampaignsForCoupon(cid, campaignId, true);
  if (!campaigns.length) {
    if (campaignId) return null;
    const anyActiveCampaigns = await selectActiveCampaignsForCoupon(cid, '', false);
    return anyActiveCampaigns.length ? null : { campaignId: null };
  }
  const [matched] = await filterCampaignsForAudience(campaigns, userId);
  return matched ? { campaignId: matched.id, campaign: matched } : null;
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
  isCouponCampaignClaimAllowed,
  resolveCouponCampaignClaim,
  selectCouponIdsByCampaignId,
};
