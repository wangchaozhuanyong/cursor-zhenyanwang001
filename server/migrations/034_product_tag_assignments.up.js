module.exports = {
  async up(query) {
    await query(`
      CREATE TABLE IF NOT EXISTS product_tag_assignments (
        product_id VARCHAR(36) NOT NULL,
        tag_id VARCHAR(36) NOT NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (product_id, tag_id),
        KEY idx_pta_tag (tag_id),
        CONSTRAINT fk_pta_product FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE CASCADE,
        CONSTRAINT fk_pta_tag FOREIGN KEY (tag_id) REFERENCES product_tags (id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    try {
      await query(`
        ALTER TABLE product_tags
        ADD COLUMN color VARCHAR(20) NOT NULL DEFAULT '金色' AFTER name
      `);
    } catch (e) {
      if (e.code !== 'ER_DUP_FIELDNAME') throw e;
    }
  },
};
