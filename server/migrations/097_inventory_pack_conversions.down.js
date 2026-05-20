module.exports = {
  async down(query) {
    await query('DROP TABLE IF EXISTS inventory_conversion_orders').catch(() => {});
    await query('DROP TABLE IF EXISTS inventory_pack_rules').catch(() => {});
    await query('ALTER TABLE product_variants DROP COLUMN unit_name').catch(() => {});
  },
};
