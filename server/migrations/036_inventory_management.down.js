module.exports = {
  async down(query) {
    await query(`
      DELETE rp FROM role_permissions rp
      JOIN permissions p ON p.id = rp.permission_id
      WHERE p.code = 'inventory.manage'
    `).catch(() => {});
    await query("DELETE FROM permissions WHERE code = 'inventory.manage'").catch(() => {});
    await query('DROP TABLE IF EXISTS inventory_stock_records');
    await query('ALTER TABLE product_variants DROP COLUMN stock_warning_threshold').catch((e) => {
      if (e.code !== 'ER_CANT_DROP_FIELD_OR_KEY') throw e;
    });
    await query('ALTER TABLE products DROP COLUMN stock_warning_threshold').catch((e) => {
      if (e.code !== 'ER_CANT_DROP_FIELD_OR_KEY') throw e;
    });
  },
};
