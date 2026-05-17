module.exports = {
  async up(query) {
    await query(`
      ALTER TABLE member_levels
      ADD COLUMN coupon_pack_id VARCHAR(64) NULL AFTER points_multiplier
    `).catch((e) => {
      if (e.code !== 'ER_DUP_FIELDNAME') throw e;
    });
  },
};
