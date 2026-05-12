module.exports = {
  async up(query) {
    // Add optional structured target fields for home nav items.
    // Backward compatible: existing rows keep using link_url.
    await query(`
      ALTER TABLE home_nav_items
        ADD COLUMN target_type VARCHAR(20) NOT NULL DEFAULT 'url' COMMENT 'url | category' AFTER link_url,
        ADD COLUMN target_category_id VARCHAR(36) DEFAULT NULL COMMENT 'when target_type=category' AFTER target_type,
        ADD KEY idx_home_nav_target (target_type, target_category_id)
    `).catch(() => {});
  },
};

