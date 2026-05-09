module.exports = {
  async up(query) {
    await query(`
      ALTER TABLE products
      ADD COLUMN lifecycle_status TINYINT NOT NULL DEFAULT 1
        COMMENT '0 draft 1 on_shelf 2 off_shelf'
        AFTER status
    `).catch(() => {});

    await query(`
      UPDATE products SET lifecycle_status = CASE
        WHEN status = 'active' THEN 1
        WHEN status = 'draft' THEN 0
        ELSE 2
      END
    `);

    await query(`
      CREATE INDEX idx_products_lifecycle ON products (lifecycle_status)
    `).catch(() => {});

    await query(`
      CREATE TABLE IF NOT EXISTS product_variants (
        id VARCHAR(36) NOT NULL PRIMARY KEY,
        product_id VARCHAR(36) NOT NULL,
        sku_code VARCHAR(64) DEFAULT NULL,
        title VARCHAR(255) NOT NULL DEFAULT '',
        price DECIMAL(10,2) NOT NULL DEFAULT 0,
        stock INT NOT NULL DEFAULT 0,
        sort_order INT NOT NULL DEFAULT 0,
        is_default TINYINT(1) NOT NULL DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        KEY idx_pv_product (product_id),
        CONSTRAINT fk_pv_product FOREIGN KEY (product_id) REFERENCES products (id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await query(`
      INSERT INTO product_variants (id, product_id, sku_code, title, price, stock, sort_order, is_default)
      SELECT UUID(), p.id, NULL, '', p.price, p.stock, 0, 1
      FROM products p
      LEFT JOIN product_variants v ON v.product_id = p.id AND v.is_default = 1
      WHERE v.id IS NULL
    `);
  },
};
