module.exports = {
  async down(query) {
    await query(`ALTER TABLE users DROP COLUMN member_level_manual_at`).catch(() => {});
    await query(`ALTER TABLE users DROP COLUMN member_level_manual_reason`).catch(() => {});
    await query(`ALTER TABLE users DROP COLUMN member_level_manual_locked`).catch(() => {});
  },
};
