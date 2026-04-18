/**
 * 对齐 admin_logs 与 adminAudit：部分环境仅有 admin_id（002 迁移），部分仅有 operator（旧脚本），按需补列。
 */
module.exports = {
  async up(query) {
    const alters = [
      'ALTER TABLE admin_logs ADD COLUMN admin_id VARCHAR(36) DEFAULT NULL',
      "ALTER TABLE admin_logs ADD COLUMN operator VARCHAR(100) NOT NULL DEFAULT ''",
    ];
    for (const sql of alters) {
      try {
        await query(sql);
      } catch (e) {
        if (e.code !== 'ER_DUP_FIELDNAME') throw e;
      }
    }
  },
};
