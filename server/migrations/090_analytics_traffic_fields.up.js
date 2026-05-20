module.exports = {
  async up(query) {
    await query(`
      ALTER TABLE analytics_events
      MODIFY COLUMN dedupe_key VARCHAR(128) NULL DEFAULT NULL
    `).catch(() => {});
    await query(`UPDATE analytics_events SET dedupe_key = NULL WHERE dedupe_key = ''`).catch(() => {});

    await query(`
      ALTER TABLE analytics_events
      ADD COLUMN path VARCHAR(255) NOT NULL DEFAULT '' AFTER page,
      ADD COLUMN url VARCHAR(1024) NOT NULL DEFAULT '' AFTER path,
      ADD COLUMN title VARCHAR(255) NOT NULL DEFAULT '' AFTER url,
      ADD COLUMN referrer_domain VARCHAR(255) NOT NULL DEFAULT '' AFTER referrer,
      ADD COLUMN traffic_source VARCHAR(64) NOT NULL DEFAULT '' AFTER referrer_domain,
      ADD COLUMN utm_source VARCHAR(100) NOT NULL DEFAULT '' AFTER traffic_source,
      ADD COLUMN utm_medium VARCHAR(100) NOT NULL DEFAULT '' AFTER utm_source,
      ADD COLUMN utm_campaign VARCHAR(150) NOT NULL DEFAULT '' AFTER utm_medium,
      ADD COLUMN utm_content VARCHAR(150) NOT NULL DEFAULT '' AFTER utm_campaign,
      ADD COLUMN browser VARCHAR(64) NOT NULL DEFAULT '' AFTER user_agent,
      ADD COLUMN os VARCHAR(64) NOT NULL DEFAULT '' AFTER browser,
      ADD COLUMN browser_language VARCHAR(32) NOT NULL DEFAULT '' AFTER os,
      ADD COLUMN screen_width INT NULL DEFAULT NULL AFTER browser_language,
      ADD COLUMN screen_height INT NULL DEFAULT NULL AFTER screen_width,
      ADD COLUMN viewport_width INT NULL DEFAULT NULL AFTER screen_height,
      ADD COLUMN viewport_height INT NULL DEFAULT NULL AFTER viewport_width,
      ADD COLUMN duration_ms INT NULL DEFAULT NULL AFTER viewport_height,
      ADD COLUMN scroll_depth DECIMAL(5,2) NULL DEFAULT NULL AFTER duration_ms
    `).catch(() => {});

    await query(`DROP INDEX uk_analytics_events_dedupe_key ON analytics_events`).catch(() => {});
    await query(`CREATE UNIQUE INDEX uk_analytics_events_dedupe_key ON analytics_events (dedupe_key)`).catch(() => {});
    await query(`CREATE INDEX idx_analytics_events_path_time ON analytics_events (path, created_at)`).catch(() => {});
    await query(`CREATE INDEX idx_analytics_events_source_time ON analytics_events (traffic_source, created_at)`).catch(() => {});
    await query(`CREATE INDEX idx_analytics_events_ref_domain_time ON analytics_events (referrer_domain, created_at)`).catch(() => {});
    await query(`CREATE INDEX idx_analytics_events_device_time ON analytics_events (device, created_at)`).catch(() => {});
    await query(`CREATE INDEX idx_analytics_events_browser_time ON analytics_events (browser, created_at)`).catch(() => {});
  },
};
