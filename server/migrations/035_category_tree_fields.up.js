module.exports = {
  async up(query) {
    await query(`
      ALTER TABLE categories
      ADD COLUMN parent_id VARCHAR(36) DEFAULT NULL AFTER id
    `).catch((e) => {
      if (e.code !== 'ER_DUP_FIELDNAME') throw e;
    });

    await query(`
      ALTER TABLE categories
      ADD COLUMN icon_url VARCHAR(500) DEFAULT '' AFTER icon
    `).catch((e) => {
      if (e.code !== 'ER_DUP_FIELDNAME') throw e;
    });

    await query(`
      ALTER TABLE categories
      ADD COLUMN is_visible TINYINT(1) NOT NULL DEFAULT 1 AFTER is_active
    `).catch((e) => {
      if (e.code !== 'ER_DUP_FIELDNAME') throw e;
    });

    await query(`
      ALTER TABLE categories
      ADD COLUMN updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    `).catch((e) => {
      if (e.code !== 'ER_DUP_FIELDNAME') throw e;
    });

    await query(`
      UPDATE categories
      SET icon_url = COALESCE(NULLIF(icon_url, ''), icon, '')
    `);

    await query(`
      CREATE INDEX idx_categories_parent_sort ON categories (parent_id, sort_order)
    `).catch(() => {});

    await query(`
      CREATE INDEX idx_categories_parent_deleted ON categories (parent_id, deleted_at)
    `).catch(() => {});

    await query(`
      CREATE INDEX idx_categories_visible ON categories (is_visible)
    `).catch(() => {});
  },
};
