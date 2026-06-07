async function hasTable(query, tableName) {
  const [rows] = await query(
    `SELECT 1
     FROM information_schema.TABLES
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?
     LIMIT 1`,
    [tableName],
  );
  return rows.length > 0;
}

async function hasColumn(query, tableName, columnName) {
  const [rows] = await query(
    `SELECT 1
     FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?
     LIMIT 1`,
    [tableName, columnName],
  );
  return rows.length > 0;
}

async function hasIndex(query, tableName, indexName) {
  const [rows] = await query(
    `SELECT 1
     FROM information_schema.STATISTICS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND INDEX_NAME = ?
     LIMIT 1`,
    [tableName, indexName],
  );
  return rows.length > 0;
}

async function addColumnIfMissing(query, columnName, ddl) {
  if (await hasColumn(query, 'coupons', columnName)) return;
  await query(`ALTER TABLE coupons ADD COLUMN ${ddl}`);
}

module.exports = {
  async up(query) {
    if (!(await hasTable(query, 'coupons'))) return;

    await addColumnIfMissing(query, 'campaign_start_at', 'campaign_start_at DATETIME NULL AFTER claim_end_at');
    await addColumnIfMissing(query, 'campaign_end_at', 'campaign_end_at DATETIME NULL AFTER campaign_start_at');
    await addColumnIfMissing(query, 'post_end_valid_days', 'post_end_valid_days INT NOT NULL DEFAULT 0 AFTER campaign_end_at');
    await addColumnIfMissing(query, 'display_positions', 'display_positions JSON NULL AFTER display_badge');
    await addColumnIfMissing(query, 'audience_type', "audience_type VARCHAR(50) NOT NULL DEFAULT 'all' AFTER display_positions");
    await addColumnIfMissing(query, 'audience_config', 'audience_config JSON NULL AFTER audience_type');
    await addColumnIfMissing(query, 'source_campaign_id', 'source_campaign_id VARCHAR(64) NULL AFTER follow_activity_id');
    await addColumnIfMissing(query, 'source_coupon_id', 'source_coupon_id VARCHAR(64) NULL AFTER source_campaign_id');

    await query(`
      UPDATE coupons
      SET
        campaign_start_at = COALESCE(campaign_start_at, claim_start_at, use_start_at, CONCAT(start_date, ' 00:00:00')),
        campaign_end_at = COALESCE(campaign_end_at, claim_end_at, use_end_at, CONCAT(end_date, ' 23:59:59')),
        display_positions = COALESCE(display_positions, JSON_ARRAY('home_coupon_zone')),
        audience_type = COALESCE(NULLIF(audience_type, ''), 'all'),
        source_coupon_id = COALESCE(source_coupon_id, id)
    `);

    if ((await hasTable(query, 'coupon_campaigns')) && (await hasTable(query, 'coupon_campaign_items'))) {
      const campaignsHasPostEnd = await hasColumn(query, 'coupon_campaigns', 'post_end_valid_days');
      const postEndExpr = campaignsHasPostEnd ? 'COALESCE(ca.post_end_valid_days, c.post_end_valid_days, 0)' : 'COALESCE(c.post_end_valid_days, 0)';
      await query(`
        UPDATE coupons c
        JOIN coupon_campaign_items ci ON BINARY ci.coupon_id = BINARY c.id
        JOIN coupon_campaigns ca ON BINARY ca.id = BINARY ci.campaign_id
        SET
          c.campaign_start_at = COALESCE(ca.start_at, c.campaign_start_at, c.claim_start_at, c.use_start_at),
          c.campaign_end_at = COALESCE(ca.end_at, c.campaign_end_at, c.claim_end_at, c.use_end_at),
          c.post_end_valid_days = ${postEndExpr},
          c.display_positions = COALESCE(ca.display_positions, c.display_positions, JSON_ARRAY('home_coupon_zone')),
          c.audience_type = COALESCE(NULLIF(ca.audience_type, ''), c.audience_type, 'all'),
          c.audience_config = COALESCE(ca.audience_config, c.audience_config),
          c.issue_mode = COALESCE(ca.issue_mode, c.issue_mode),
          c.source_campaign_id = COALESCE(c.source_campaign_id, ca.id),
          c.source_coupon_id = COALESCE(c.source_coupon_id, c.id)
        WHERE c.deleted_at IS NULL
      `);
    }

    if (await hasTable(query, 'user_coupons')) {
      await query(`
        UPDATE user_coupons uc
        JOIN coupons c ON BINARY c.id = BINARY uc.coupon_id
        SET uc.valid_until = LEAST(
          COALESCE(uc.valid_until, '9999-12-31 23:59:59'),
          CASE
            WHEN c.post_end_valid_days > 0 AND c.campaign_end_at IS NOT NULL
              THEN DATE_ADD(c.campaign_end_at, INTERVAL c.post_end_valid_days DAY)
            ELSE COALESCE(c.campaign_end_at, c.use_end_at, CONCAT(c.end_date, ' 23:59:59'), '9999-12-31 23:59:59')
          END
        )
        WHERE uc.status IN ('available', 'pending')
      `);

      await query(`
        UPDATE user_coupons uc
        JOIN coupons c ON BINARY c.id = BINARY uc.coupon_id
        SET uc.status = 'expired',
            uc.invalid_reason = COALESCE(uc.invalid_reason, '礼券活动已结束')
        WHERE uc.status IN ('available', 'pending')
          AND c.post_end_valid_days = 0
          AND c.campaign_end_at IS NOT NULL
          AND c.campaign_end_at < NOW()
      `);
    }

    if (!(await hasIndex(query, 'coupons', 'idx_coupons_campaign_window'))) {
      await query('CREATE INDEX idx_coupons_campaign_window ON coupons (campaign_start_at, campaign_end_at)');
    }
    if (!(await hasIndex(query, 'coupons', 'idx_coupons_source_campaign'))) {
      await query('CREATE INDEX idx_coupons_source_campaign ON coupons (source_campaign_id)');
    }
  },
};
