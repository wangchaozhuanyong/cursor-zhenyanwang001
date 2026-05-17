/** 移除会员等级未使用的券包 ID 字段 */
module.exports = {
  async up(query) {
    await query(`
      ALTER TABLE member_levels
      DROP COLUMN coupon_pack_id
    `).catch((e) => {
      if (e.code !== 'ER_CANT_DROP_FIELD_OR_KEY' && e.code !== 'ER_BAD_FIELD_ERROR') throw e;
    });
  },
};
