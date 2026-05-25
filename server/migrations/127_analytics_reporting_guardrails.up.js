module.exports = {
  async up(query) {
    await query(`CREATE INDEX idx_analytics_events_created_type ON analytics_events (created_at, event_type)`).catch(() => {});
    await query(`CREATE INDEX idx_analytics_events_created_session ON analytics_events (created_at, session_id)`).catch(() => {});
    await query(`CREATE INDEX idx_analytics_events_created_source ON analytics_events (created_at, traffic_source)`).catch(() => {});
    await query(`CREATE INDEX idx_analytics_events_created_device ON analytics_events (created_at, device)`).catch(() => {});
    await query(`CREATE INDEX idx_analytics_events_created_path ON analytics_events (created_at, path)`).catch(() => {});
  },
};
