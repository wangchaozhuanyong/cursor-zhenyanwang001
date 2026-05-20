module.exports = {
  async down(query) {
    await query(`DROP INDEX idx_analytics_events_source_type_time ON analytics_events`).catch(() => {});
    await query(`DROP INDEX idx_analytics_events_session_type_time ON analytics_events`).catch(() => {});
    await query(`DROP INDEX idx_analytics_events_anon_time ON analytics_events`).catch(() => {});
  },
};
