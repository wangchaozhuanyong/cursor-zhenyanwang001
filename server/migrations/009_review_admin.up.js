/**
 * 为 product_reviews 添加后台管理所需字段：
 * - status: 评论状态（normal/hidden/deleted）
 * - admin_reply: 官方回复内容
 * - admin_reply_at: 官方回复时间
 * - deleted_at / deleted_by: 软删除
 */
module.exports = {
  async up(query) {
    const cols = [
      { sql: "ALTER TABLE product_reviews ADD COLUMN status VARCHAR(20) NOT NULL DEFAULT 'normal'", err: 'ER_DUP_FIELDNAME' },
      { sql: "ALTER TABLE product_reviews ADD COLUMN admin_reply TEXT DEFAULT NULL", err: 'ER_DUP_FIELDNAME' },
      { sql: "ALTER TABLE product_reviews ADD COLUMN admin_reply_at DATETIME DEFAULT NULL", err: 'ER_DUP_FIELDNAME' },
      { sql: "ALTER TABLE product_reviews ADD COLUMN deleted_at DATETIME DEFAULT NULL", err: 'ER_DUP_FIELDNAME' },
      { sql: "ALTER TABLE product_reviews ADD COLUMN deleted_by VARCHAR(36) DEFAULT NULL", err: 'ER_DUP_FIELDNAME' },
    ];
    for (const c of cols) {
      try { await query(c.sql); } catch (e) { if (e.code !== c.err) throw e; }
    }
    try { await query("CREATE INDEX idx_reviews_status ON product_reviews (status)"); } catch (e) { if (e.code !== 'ER_DUP_KEYNAME') throw e; }
    try { await query("CREATE INDEX idx_reviews_deleted ON product_reviews (deleted_at)"); } catch (e) { if (e.code !== 'ER_DUP_KEYNAME') throw e; }
  },
};
