/**
 * users 表补充 deleted_at：后台 RBAC 软删管理员账号、脚本与部分查询依赖该列。
 * 缺列时 UPDATE ... deleted_at = NOW() 会触发 ER_BAD_FIELD_ERROR → 客户端表现为 500。
 */
module.exports = {
  async up(query) {
    try {
      await query('ALTER TABLE users ADD COLUMN deleted_at DATETIME DEFAULT NULL');
    } catch (e) {
      if (e.code !== 'ER_DUP_FIELDNAME') throw e;
    }
    try {
      await query('CREATE INDEX idx_users_deleted ON users (deleted_at)');
    } catch (e) {
      if (e.code !== 'ER_DUP_KEYNAME') throw e;
    }
  },
};
