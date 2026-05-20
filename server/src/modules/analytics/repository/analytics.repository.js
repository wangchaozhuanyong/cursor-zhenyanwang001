const db = require('../../../config/db');

async function insertEvent(row) {
  await db.query(
    `INSERT INTO analytics_events
      (user_id, anonymous_id, session_id, dedupe_key, event_type, module, page, path, url, title, product_id, variant_id, category_id, activity_id, coupon_id, keyword, order_id, amount, quantity, device, referrer, referrer_domain, traffic_source, utm_source, utm_medium, utm_campaign, utm_content, ip_hash, user_agent, browser, os, browser_language, screen_width, screen_height, viewport_width, viewport_height, duration_ms, scroll_depth)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
     ON DUPLICATE KEY UPDATE id=id`,
    [
      row.user_id || null,
      row.anonymous_id || '',
      row.session_id || '',
      row.dedupe_key ?? null,
      row.event_type,
      row.module || '',
      row.page || '',
      row.path || row.page || '',
      row.url || '',
      row.title || '',
      row.product_id || null,
      row.variant_id || null,
      row.category_id || null,
      row.activity_id || null,
      row.coupon_id || null,
      row.keyword || '',
      row.order_id || null,
      row.amount ?? null,
      row.quantity ?? null,
      row.device || '',
      row.referrer || '',
      row.referrer_domain || '',
      row.traffic_source || '',
      row.utm_source || '',
      row.utm_medium || '',
      row.utm_campaign || '',
      row.utm_content || '',
      row.ip_hash || '',
      row.user_agent || '',
      row.browser || '',
      row.os || '',
      row.browser_language || '',
      row.screen_width ?? null,
      row.screen_height ?? null,
      row.viewport_width ?? null,
      row.viewport_height ?? null,
      row.duration_ms ?? null,
      row.scroll_depth ?? null,
    ],
  );
}

module.exports = {
  insertEvent,
};
