module.exports = {
  async down(query) {
    await query(`DROP INDEX idx_analytics_events_created_path ON analytics_events`).catch(() => {});
    await query(`DROP INDEX idx_analytics_events_created_device ON analytics_events`).catch(() => {});
    await query(`DROP INDEX idx_analytics_events_created_source ON analytics_events`).catch(() => {});
    await query(`DROP INDEX idx_analytics_events_created_session ON analytics_events`).catch(() => {});
    await query(`DROP INDEX idx_analytics_events_created_type ON analytics_events`).catch(() => {});
  },
};
