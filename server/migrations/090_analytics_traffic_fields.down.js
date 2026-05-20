module.exports = {
  async down(query) {
    await query('DROP INDEX idx_analytics_events_browser_time ON analytics_events').catch(() => {});
    await query('DROP INDEX idx_analytics_events_device_time ON analytics_events').catch(() => {});
    await query('DROP INDEX idx_analytics_events_ref_domain_time ON analytics_events').catch(() => {});
    await query('DROP INDEX idx_analytics_events_source_time ON analytics_events').catch(() => {});
    await query('DROP INDEX idx_analytics_events_path_time ON analytics_events').catch(() => {});
    await query('DROP INDEX uk_analytics_events_dedupe_key ON analytics_events').catch(() => {});

    await query(`
      ALTER TABLE analytics_events
      DROP COLUMN scroll_depth,
      DROP COLUMN duration_ms,
      DROP COLUMN viewport_height,
      DROP COLUMN viewport_width,
      DROP COLUMN screen_height,
      DROP COLUMN screen_width,
      DROP COLUMN browser_language,
      DROP COLUMN os,
      DROP COLUMN browser,
      DROP COLUMN utm_content,
      DROP COLUMN utm_campaign,
      DROP COLUMN utm_medium,
      DROP COLUMN utm_source,
      DROP COLUMN traffic_source,
      DROP COLUMN referrer_domain,
      DROP COLUMN title,
      DROP COLUMN url,
      DROP COLUMN path
    `).catch(() => {});

    await query(`
      ALTER TABLE analytics_events
      MODIFY COLUMN dedupe_key VARCHAR(128) NOT NULL DEFAULT ''
    `).catch(() => {});
    await query(`CREATE UNIQUE INDEX uk_analytics_events_dedupe_key ON analytics_events (dedupe_key)`).catch(() => {});
  },
};
