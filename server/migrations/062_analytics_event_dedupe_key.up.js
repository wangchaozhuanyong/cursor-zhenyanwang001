module.exports = {
  async up(query) {
    await query(`
      ALTER TABLE analytics_events
      ADD COLUMN dedupe_key VARCHAR(128) NOT NULL DEFAULT '' AFTER session_id
    `).catch(() => {});

    await query(`
      CREATE UNIQUE INDEX uk_analytics_events_dedupe_key ON analytics_events (dedupe_key)
    `).catch(() => {});
  },
};

