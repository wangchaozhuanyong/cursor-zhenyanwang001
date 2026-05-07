/**
 * 新品主视觉运营配置 + 首页新品埋点表
 */
module.exports = {
  async up(query) {
    await query(`
      CREATE TABLE IF NOT EXISTS home_engagement_events (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        module VARCHAR(32) NOT NULL,
        event_key VARCHAR(32) NOT NULL,
        product_id VARCHAR(64) NULL,
        session_id VARCHAR(64) NULL,
        meta_json TEXT NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_home_event_time (module, event_key, created_at),
        INDEX idx_home_event_product (product_id, created_at),
        INDEX idx_home_event_session (session_id, created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await query(`
      INSERT INTO site_settings (setting_key, setting_value)
      VALUES
        ('newArrivalHeroImage', ''),
        ('newArrivalHeroTitle', ''),
        ('newArrivalHeroSubtitle', ''),
        ('newArrivalHeroCtaText', '')
      ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)
    `);
  },
};
