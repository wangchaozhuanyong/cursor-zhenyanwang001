const RULES = [
  [
    'PRODUCT_SEARCH_KEYWORDS_MISMATCH',
    'search',
    '商品搜索索引与主数据不一致',
    'products.search_keywords 与商品名称、描述、SKU、标签重新计算结果不一致。',
    'P2',
    '0 4 * * *',
    1,
  ],
  [
    'ANALYTICS_PAYMENT_SUCCESS_MISSING',
    'analytics',
    '已支付订单缺少支付成功埋点',
    'orders 已支付，但 analytics_events 缺少 payment_success，可能导致客户端活动和转化报表少算。',
    'P2',
    '*/30 * * * *',
    1,
  ],
];

module.exports = {
  async up(query) {
    for (const [code, moduleName, title, description, severity, cron, autoFix] of RULES) {
      await query(
        `INSERT INTO data_consistency_rules
          (code, module, title, description, severity, enabled, schedule_cron, auto_fix_enabled)
         VALUES (?, ?, ?, ?, ?, 1, ?, ?)
         ON DUPLICATE KEY UPDATE
          module = VALUES(module),
          title = VALUES(title),
          description = VALUES(description),
          severity = VALUES(severity),
          schedule_cron = VALUES(schedule_cron),
          auto_fix_enabled = VALUES(auto_fix_enabled)`,
        [code, moduleName, title, description, severity, cron, autoFix],
      );
    }
  },
};
