/**
 * 无法可靠恢复已软删行，down 为空实现（与多数数据清理迁移一致）。
 */
module.exports = {
  async down(_query) {
    /* intentional no-op：已软删数据不应在 down 中误恢复 */
  },
};
