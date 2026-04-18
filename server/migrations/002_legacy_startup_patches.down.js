/**
 * 历史补丁不可逆：若需回滚请从数据库备份恢复。
 */
module.exports = {
  async down() {
    throw new Error(
      '002_legacy_startup_patches 不提供自动 down（列/表已存在生产数据），请从备份恢复或手动处理。',
    );
  },
};
