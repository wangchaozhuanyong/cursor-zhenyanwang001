module.exports = {
  async down(query) {
    await query('DROP INDEX uk_analytics_events_dedupe_key ON analytics_events').catch(() => {});
    await query('ALTER TABLE analytics_events DROP COLUMN dedupe_key').catch(() => {});
  },
};

