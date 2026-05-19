module.exports = {
  async up(query) {
    await query(`
      CREATE TABLE IF NOT EXISTS product_spec_groups (
        id VARCHAR(36) PRIMARY KEY,
        product_id VARCHAR(36) NOT NULL,
        name VARCHAR(64) NOT NULL,
        sort_order INT NOT NULL DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        deleted_at DATETIME NULL,
        KEY idx_psg_product (product_id),
        KEY idx_psg_deleted (deleted_at),
        CONSTRAINT fk_psg_product FOREIGN KEY (product_id) REFERENCES products(id)
      )
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS product_spec_values (
        id VARCHAR(36) PRIMARY KEY,
        product_id VARCHAR(36) NOT NULL,
        group_id VARCHAR(36) NOT NULL,
        value VARCHAR(64) NOT NULL,
        image_url VARCHAR(500) NULL,
        sort_order INT NOT NULL DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        deleted_at DATETIME NULL,
        KEY idx_psv_product (product_id),
        KEY idx_psv_group (group_id),
        KEY idx_psv_deleted (deleted_at),
        CONSTRAINT fk_psv_product FOREIGN KEY (product_id) REFERENCES products(id),
        CONSTRAINT fk_psv_group FOREIGN KEY (group_id) REFERENCES product_spec_groups(id)
      )
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS product_variant_spec_values (
        id VARCHAR(36) PRIMARY KEY,
        product_id VARCHAR(36) NOT NULL,
        variant_id VARCHAR(36) NOT NULL,
        group_id VARCHAR(36) NOT NULL,
        value_id VARCHAR(36) NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uk_pvsv_variant_group (variant_id, group_id),
        KEY idx_pvsv_product (product_id),
        KEY idx_pvsv_value (value_id),
        CONSTRAINT fk_pvsv_product FOREIGN KEY (product_id) REFERENCES products(id),
        CONSTRAINT fk_pvsv_variant FOREIGN KEY (variant_id) REFERENCES product_variants(id) ON DELETE CASCADE,
        CONSTRAINT fk_pvsv_group FOREIGN KEY (group_id) REFERENCES product_spec_groups(id),
        CONSTRAINT fk_pvsv_value FOREIGN KEY (value_id) REFERENCES product_spec_values(id)
      )
    `);

    const addColumn = async (sql) => {
      await query(sql).catch((e) => {
        if (e.code !== 'ER_DUP_FIELDNAME') throw e;
      });
    };

    await addColumn(`ALTER TABLE product_variants ADD COLUMN original_price DECIMAL(10,2) NULL AFTER price`);
    await addColumn(`ALTER TABLE product_variants ADD COLUMN image_url VARCHAR(500) NULL AFTER barcode`);
    await addColumn(`ALTER TABLE product_variants ADD COLUMN weight DECIMAL(10,3) NULL AFTER image_url`);
    await addColumn(`ALTER TABLE product_variants ADD COLUMN enabled TINYINT(1) NOT NULL DEFAULT 1 AFTER weight`);

    await addColumn(`ALTER TABLE order_items ADD COLUMN spec_snapshot JSON NULL AFTER variant_name`);
    await addColumn(`ALTER TABLE order_items ADD COLUMN product_name_snapshot VARCHAR(255) NULL AFTER spec_snapshot`);
    await addColumn(`ALTER TABLE order_items ADD COLUMN product_image_snapshot VARCHAR(500) NULL AFTER product_name_snapshot`);
    await addColumn(`ALTER TABLE order_items ADD COLUMN variant_image_snapshot VARCHAR(500) NULL AFTER product_image_snapshot`);
  },
};
