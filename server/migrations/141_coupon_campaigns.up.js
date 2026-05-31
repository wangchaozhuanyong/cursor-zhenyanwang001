const crypto = require('crypto');

function jsonParse(value, fallback) {
  if (!value) return fallback;
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function normalizeCampaignType(type) {
  if (type === 'new_user_gift') return 'new_user_gift';
  return 'public_claim';
}

function normalizeDisplayPositions(type, positions) {
  const list = Array.isArray(positions) ? positions : [];
  if (type === 'new_user_gift') return ['home_coupon_zone'];
  return list.length ? ['home_coupon_zone'] : ['home_coupon_zone'];
}

module.exports = {
  async up(query) {
    await query(`
      CREATE TABLE IF NOT EXISTS coupon_campaigns (
        id VARCHAR(36) NOT NULL PRIMARY KEY,
        campaign_type VARCHAR(32) NOT NULL DEFAULT 'public_claim',
        title VARCHAR(120) NOT NULL,
        subtitle VARCHAR(180) NOT NULL DEFAULT '',
        description VARCHAR(1000) NOT NULL DEFAULT '',
        cover_image VARCHAR(500) NOT NULL DEFAULT '',
        start_at DATETIME NOT NULL,
        end_at DATETIME NOT NULL,
        status VARCHAR(24) NOT NULL DEFAULT 'draft',
        disabled TINYINT(1) NOT NULL DEFAULT 0,
        display_positions JSON NULL,
        audience_type VARCHAR(32) NOT NULL DEFAULT 'all',
        audience_config JSON NULL,
        issue_mode VARCHAR(32) NOT NULL DEFAULT 'self_claim',
        sort_order INT NOT NULL DEFAULT 0,
        source_activity_id VARCHAR(36) NULL,
        internal_note VARCHAR(500) NOT NULL DEFAULT '',
        created_by VARCHAR(36) NULL,
        updated_by VARCHAR(36) NULL,
        deleted_at DATETIME NULL,
        deleted_by VARCHAR(36) NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uk_coupon_campaign_source_activity (source_activity_id),
        KEY idx_coupon_campaign_runtime (disabled, status, start_at, end_at),
        KEY idx_coupon_campaign_type_runtime (campaign_type, disabled, status, start_at, end_at),
        KEY idx_coupon_campaign_deleted (deleted_at),
        KEY idx_coupon_campaign_sort (sort_order, created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS coupon_campaign_items (
        id VARCHAR(36) NOT NULL PRIMARY KEY,
        campaign_id VARCHAR(36) NOT NULL,
        coupon_id VARCHAR(36) NOT NULL,
        sort_order INT NOT NULL DEFAULT 0,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uk_coupon_campaign_item (campaign_id, coupon_id),
        KEY idx_coupon_campaign_items_coupon (coupon_id),
        CONSTRAINT fk_coupon_campaign_items_campaign
          FOREIGN KEY (campaign_id) REFERENCES coupon_campaigns(id) ON DELETE CASCADE,
        CONSTRAINT fk_coupon_campaign_items_coupon
          FOREIGN KEY (coupon_id) REFERENCES coupons(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS coupon_campaign_audiences (
        id VARCHAR(36) NOT NULL PRIMARY KEY,
        campaign_id VARCHAR(36) NOT NULL,
        scope_type VARCHAR(32) NOT NULL,
        scope_id VARCHAR(64) NOT NULL DEFAULT '',
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uk_coupon_campaign_audience (campaign_id, scope_type, scope_id),
        KEY idx_coupon_campaign_audience_scope (scope_type, scope_id),
        CONSTRAINT fk_coupon_campaign_audiences_campaign
          FOREIGN KEY (campaign_id) REFERENCES coupon_campaigns(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    const [activities] = await query(`
      SELECT id, type, title, subtitle, cover_image, description, start_at, end_at,
             status, disabled, display_positions, activity_config, sort_order,
             created_by, updated_by, deleted_at
        FROM marketing_activities
       WHERE deleted_at IS NULL
         AND type IN ('coupon_activity', 'new_user_gift')
    `).catch((error) => {
      if (error?.code === 'ER_NO_SUCH_TABLE') return [[]];
      throw error;
    });

    for (const activity of activities || []) {
      const campaignId = crypto.randomUUID();
      const campaignType = normalizeCampaignType(activity.type);
      const config = jsonParse(activity.activity_config, {});
      const couponIds = Array.isArray(config?.coupon_ids)
        ? [...new Set(config.coupon_ids.map((id) => String(id || '').trim()).filter(Boolean))]
        : [];
      const displayPositions = normalizeDisplayPositions(activity.type, jsonParse(activity.display_positions, []));
      const status = activity.status === 'draft' ? 'draft' : activity.disabled ? 'disabled' : 'active';
      const audienceType = campaignType === 'new_user_gift' ? 'new_user' : 'all';
      const issueMode = campaignType === 'new_user_gift' ? 'auto_register' : 'self_claim';

      await query(
        `INSERT IGNORE INTO coupon_campaigns
          (id, campaign_type, title, subtitle, description, cover_image, start_at, end_at,
           status, disabled, display_positions, audience_type, audience_config, issue_mode,
           sort_order, source_activity_id, internal_note, created_by, updated_by)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        [
          campaignId,
          campaignType,
          activity.title || '优惠券活动',
          activity.subtitle || '',
          activity.description || '',
          activity.cover_image || '',
          activity.start_at,
          activity.end_at,
          status,
          activity.disabled ? 1 : 0,
          JSON.stringify(displayPositions),
          audienceType,
          JSON.stringify({ migrated_from_activity_id: activity.id }),
          issueMode,
          Number(activity.sort_order || 0),
          activity.id,
          '由旧营销活动自动迁移',
          activity.created_by || null,
          activity.updated_by || null,
        ],
      );

      for (const [index, couponId] of couponIds.entries()) {
        await query(
          `INSERT IGNORE INTO coupon_campaign_items (id, campaign_id, coupon_id, sort_order)
           VALUES (?,?,?,?)`,
          [crypto.randomUUID(), campaignId, couponId, index],
        );
      }

      await query(
        `INSERT IGNORE INTO coupon_campaign_audiences (id, campaign_id, scope_type, scope_id)
         VALUES (?,?,?,?)`,
        [crypto.randomUUID(), campaignId, audienceType, ''],
      );
    }

    await query(`
      UPDATE marketing_activities
         SET disabled = 1,
             status = 'disabled',
             internal_note = TRIM(CONCAT(COALESCE(internal_note, ''), ' 已迁移到优惠券活动中心')),
             updated_at = NOW()
       WHERE deleted_at IS NULL
         AND type IN ('coupon_activity', 'new_user_gift')
    `).catch((error) => {
      if (error?.code !== 'ER_NO_SUCH_TABLE') throw error;
    });
  },
};
