module.exports = {
  async up(query) {
    await query(`
      ALTER TABLE analytics_events
      MODIFY COLUMN dedupe_key VARCHAR(128) NULL DEFAULT NULL
    `).catch(() => {});

    await query(`UPDATE analytics_events SET dedupe_key = NULL WHERE dedupe_key = ''`).catch(() => {});
    await query(`
      UPDATE analytics_events
      SET dedupe_key = CONCAT(event_type, ':', order_id)
      WHERE event_type IN ('order_submit', 'payment_success')
        AND order_id IS NOT NULL
        AND order_id <> ''
    `).catch(() => {});
    await query(`
      UPDATE analytics_events ae
      LEFT JOIN (
        SELECT MIN(id) AS keep_id, dedupe_key
        FROM analytics_events
        WHERE dedupe_key IS NOT NULL AND dedupe_key <> ''
        GROUP BY dedupe_key
      ) kept ON kept.dedupe_key = ae.dedupe_key
      SET ae.dedupe_key = NULL
      WHERE ae.dedupe_key IS NOT NULL
        AND ae.dedupe_key <> ''
        AND ae.id <> kept.keep_id
    `).catch(() => {});

    await query(`DROP INDEX uk_analytics_events_dedupe_key ON analytics_events`).catch(() => {});
    await query(`CREATE UNIQUE INDEX uk_analytics_events_dedupe_key ON analytics_events (dedupe_key)`).catch(() => {});

    await query(`CREATE INDEX idx_analytics_events_anon_time ON analytics_events (anonymous_id, created_at)`).catch(() => {});
    await query(`CREATE INDEX idx_analytics_events_session_type_time ON analytics_events (session_id, event_type, created_at)`).catch(() => {});
    await query(`CREATE INDEX idx_analytics_events_source_type_time ON analytics_events (traffic_source, event_type, created_at)`).catch(() => {});
  },
};
