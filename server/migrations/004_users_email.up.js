/** 管理员资料等场景使用邮箱展示与保存 */
module.exports = {
  async up(query) {
    try {
      await query("ALTER TABLE users ADD COLUMN email VARCHAR(120) NOT NULL DEFAULT ''");
    } catch (e) {
      if (e.code !== 'ER_DUP_FIELDNAME') throw e;
    }
  },
};
