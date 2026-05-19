/** 运费模板：唯一默认标记，与 enabled 联动（仅一个 enabled + is_default） */
module.exports = {
  async up(query) {
    await query(`
      ALTER TABLE shipping_templates
      ADD COLUMN is_default TINYINT(1) NOT NULL DEFAULT 0
      AFTER enabled
    `).catch((e) => {
      if (e.code !== 'ER_DUP_FIELDNAME') throw e;
    });

    const [enabledRows] = await query(`
      SELECT id FROM shipping_templates WHERE enabled = 1 ORDER BY id ASC LIMIT 1
    `);
    const pickId = enabledRows[0]?.id;

    await query(`
      UPDATE shipping_templates SET is_default = 0, enabled = 0
    `);

    if (pickId != null) {
      await query(`
        UPDATE shipping_templates SET enabled = 1, is_default = 1 WHERE id = ?
      `, [pickId]);
      return;
    }

    const [anyRows] = await query(`
      SELECT id FROM shipping_templates ORDER BY id ASC LIMIT 1
    `);
    if (anyRows[0]?.id != null) {
      await query(`
        UPDATE shipping_templates SET enabled = 1, is_default = 1 WHERE id = ?
      `, [anyRows[0].id]);
    }
  },

  async down(query) {
    await query(`
      ALTER TABLE shipping_templates DROP COLUMN is_default
    `).catch((e) => {
      if (e.code !== 'ER_CANT_DROP_FIELD' && e.code !== 'ER_BAD_FIELD_ERROR') throw e;
    });
  },
};
