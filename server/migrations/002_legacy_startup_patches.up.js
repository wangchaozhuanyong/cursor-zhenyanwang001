/**
 * 历史兼容：原 src/index.js 启动时执行的 ALTER / CREATE，改为可追踪迁移。
 * 重复执行时忽略「列已存在」等错误。
 */
const LEGACY = [
  'ALTER TABLE orders ADD COLUMN coupon_uc_id VARCHAR(36) DEFAULT NULL',
  'ALTER TABLE orders ADD COLUMN raw_amount DECIMAL(10,2) DEFAULT NULL',
  'ALTER TABLE orders ADD COLUMN discount_amount DECIMAL(10,2) DEFAULT 0',
  'ALTER TABLE orders ADD COLUMN coupon_title VARCHAR(100) DEFAULT \'\'',
  'ALTER TABLE orders ADD COLUMN shipping_fee DECIMAL(10,2) DEFAULT 0',
  'ALTER TABLE orders ADD COLUMN shipping_name VARCHAR(50) DEFAULT \'\'',
  'ALTER TABLE orders ADD COLUMN tracking_no VARCHAR(100) DEFAULT \'\'',
  'ALTER TABLE orders ADD COLUMN carrier VARCHAR(50) DEFAULT \'\'',
  'ALTER TABLE users ADD COLUMN subordinate_enabled TINYINT(1) NOT NULL DEFAULT 0',
  `CREATE TABLE IF NOT EXISTS product_tags (
      id VARCHAR(36) NOT NULL PRIMARY KEY,
      name VARCHAR(50) NOT NULL,
      sort_order INT NOT NULL DEFAULT 0,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB`,
  `CREATE TABLE IF NOT EXISTS admin_logs (
      id VARCHAR(36) NOT NULL PRIMARY KEY,
      admin_id VARCHAR(36) DEFAULT NULL,
      action VARCHAR(100) NOT NULL,
      detail TEXT,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_admin (admin_id)
    ) ENGINE=InnoDB`,
];

function ignorable(err) {
  const c = err && err.code;
  return (
    c === 'ER_DUP_FIELDNAME'
    || c === 'ER_TABLE_EXISTS_ERROR'
    || c === 'ER_CANT_DROP_FIELD_OR_KEY'
  );
}

module.exports = {
  async up(query) {
    for (const sql of LEGACY) {
      try {
        await query(sql);
      } catch (e) {
        if (!ignorable(e)) throw e;
      }
    }
  },
};
