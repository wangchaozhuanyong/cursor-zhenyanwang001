module.exports = {
  async up(query) {
    const addColumn = async (sql) => {
      try {
        await query(sql);
      } catch (e) {
        if (e.code !== 'ER_DUP_FIELDNAME') throw e;
      }
    };

    await addColumn(`
      ALTER TABLE product_tags
      ADD COLUMN bg_color VARCHAR(20) NOT NULL DEFAULT '#FEF3C7' AFTER name
    `);
    await addColumn(`
      ALTER TABLE product_tags
      ADD COLUMN text_color VARCHAR(20) NOT NULL DEFAULT '#92400E' AFTER bg_color
    `);
    await addColumn(`
      ALTER TABLE product_tags
      ADD COLUMN enabled TINYINT(1) NOT NULL DEFAULT 1 AFTER sort_order
    `);
    await addColumn(`
      ALTER TABLE product_tags
      ADD COLUMN updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER created_at
    `);
    await addColumn(`
      ALTER TABLE product_tags
      ADD COLUMN deleted_at DATETIME NULL AFTER updated_at
    `);

    await query(`
      UPDATE product_tags
      SET
        bg_color = CASE color
          WHEN '红色' THEN '#FEE2E2'
          WHEN '绿色' THEN '#DCFCE7'
          WHEN '蓝色' THEN '#DBEAFE'
          WHEN '金色' THEN '#FEF3C7'
          ELSE bg_color
        END,
        text_color = CASE color
          WHEN '红色' THEN '#B91C1C'
          WHEN '绿色' THEN '#15803D'
          WHEN '蓝色' THEN '#1D4ED8'
          WHEN '金色' THEN '#92400E'
          ELSE text_color
        END
      WHERE color IS NOT NULL
    `).catch((e) => {
      if (e.code !== 'ER_BAD_FIELD_ERROR') throw e;
    });

    try {
      await query('CREATE INDEX idx_product_tags_enabled_sort ON product_tags (enabled, sort_order)');
    } catch (e) {
      if (e.code !== 'ER_DUP_KEYNAME') throw e;
    }
    try {
      await query('CREATE INDEX idx_product_tags_deleted ON product_tags (deleted_at)');
    } catch (e) {
      if (e.code !== 'ER_DUP_KEYNAME') throw e;
    }
  },
};
