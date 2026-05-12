module.exports = {
  async up(query) {
    const alters = [
      `ALTER TABLE order_items ADD COLUMN variant_id VARCHAR(36) NULL AFTER product_id`,
      `ALTER TABLE order_items ADD COLUMN sku_code VARCHAR(64) NOT NULL DEFAULT '' AFTER variant_id`,
      `ALTER TABLE order_items ADD COLUMN variant_name VARCHAR(255) NOT NULL DEFAULT '' AFTER sku_code`,
      `ALTER TABLE order_items ADD COLUMN subtotal DECIMAL(10,2) NOT NULL DEFAULT 0 AFTER qty`,
      `ALTER TABLE orders ADD COLUMN address_line1 VARCHAR(255) NOT NULL DEFAULT '' AFTER address`,
      `ALTER TABLE orders ADD COLUMN address_line2 VARCHAR(255) NOT NULL DEFAULT '' AFTER address_line1`,
      `ALTER TABLE orders ADD COLUMN address_city VARCHAR(80) NOT NULL DEFAULT '' AFTER address_line2`,
      `ALTER TABLE orders ADD COLUMN address_state VARCHAR(80) NOT NULL DEFAULT '' AFTER address_city`,
      `ALTER TABLE orders ADD COLUMN address_postcode VARCHAR(12) NOT NULL DEFAULT '' AFTER address_state`,
      `ALTER TABLE orders ADD COLUMN address_country VARCHAR(2) NOT NULL DEFAULT 'MY' AFTER address_postcode`,
      `ALTER TABLE orders ADD COLUMN payment_provider VARCHAR(32) NOT NULL DEFAULT '' AFTER payment_method`,
      `ALTER TABLE orders ADD COLUMN provider_payment_id VARCHAR(128) NOT NULL DEFAULT '' AFTER payment_provider`,
      `ALTER TABLE orders ADD COLUMN paid_at DATETIME NULL AFTER provider_payment_id`,
      `ALTER TABLE orders ADD COLUMN refund_status VARCHAR(32) NOT NULL DEFAULT 'none' AFTER paid_at`,
      `ALTER TABLE return_requests ADD COLUMN order_item_id VARCHAR(36) NULL AFTER order_id`,
      `ALTER TABLE return_requests ADD COLUMN product_id VARCHAR(36) NULL AFTER order_item_id`,
      `ALTER TABLE return_requests ADD COLUMN variant_id VARCHAR(36) NULL AFTER product_id`,
      `ALTER TABLE return_requests ADD COLUMN sku_code VARCHAR(64) NOT NULL DEFAULT '' AFTER variant_id`,
      `ALTER TABLE return_requests ADD COLUMN quantity INT NOT NULL DEFAULT 1 AFTER sku_code`,
      `ALTER TABLE cart_items ADD COLUMN variant_id VARCHAR(36) NOT NULL DEFAULT '' AFTER product_id`,
      `ALTER TABLE cart_items ADD COLUMN sku_code VARCHAR(64) NOT NULL DEFAULT '' AFTER variant_id`,
      `ALTER TABLE checkout_abandonments ADD COLUMN reminder_count INT NOT NULL DEFAULT 0 AFTER contact_phone_masked`,
      `ALTER TABLE checkout_abandonments ADD COLUMN last_reminded_at DATETIME NULL AFTER reminder_count`,
      `ALTER TABLE checkout_abandonments ADD COLUMN next_reminder_at DATETIME NULL AFTER last_reminded_at`,
      `ALTER TABLE checkout_abandonments ADD COLUMN reminder_channel VARCHAR(24) NOT NULL DEFAULT '' AFTER next_reminder_at`,
    ];

    for (const sql of alters) {
      await query(sql).catch((e) => {
        if (e.code !== 'ER_DUP_FIELDNAME') throw e;
      });
    }

    const indexes = [
      `CREATE INDEX idx_order_items_variant ON order_items (variant_id)`,
      `CREATE INDEX idx_orders_payment_provider ON orders (payment_provider, provider_payment_id)`,
      `CREATE INDEX idx_orders_address_state ON orders (address_country, address_state, address_postcode)`,
      `CREATE INDEX idx_return_requests_order_item ON return_requests (order_item_id)`,
      `CREATE INDEX idx_checkout_abandonments_reminder ON checkout_abandonments (status, next_reminder_at, reminder_count)`,
    ];
    for (const sql of indexes) {
      await query(sql).catch((e) => {
        if (e.code !== 'ER_DUP_KEYNAME') throw e;
      });
    }

    await query(`ALTER TABLE cart_items DROP INDEX uk_cart_user_product`).catch((e) => {
      if (e.code !== 'ER_CANT_DROP_FIELD_OR_KEY') throw e;
    });
    await query(`CREATE UNIQUE INDEX uk_cart_user_product_variant ON cart_items (user_id, product_id, variant_id)`).catch((e) => {
      if (e.code !== 'ER_DUP_KEYNAME') throw e;
    });

    await query(`
      CREATE TABLE IF NOT EXISTS privacy_consents (
        id VARCHAR(36) NOT NULL PRIMARY KEY,
        user_id VARCHAR(36) NULL,
        anonymous_id VARCHAR(64) NOT NULL DEFAULT '',
        consent_version VARCHAR(32) NOT NULL DEFAULT 'v1',
        analytics_allowed TINYINT(1) NOT NULL DEFAULT 0,
        ads_allowed TINYINT(1) NOT NULL DEFAULT 0,
        ip_hash VARCHAR(64) NOT NULL DEFAULT '',
        user_agent VARCHAR(255) NOT NULL DEFAULT '',
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        KEY idx_privacy_consents_user (user_id, created_at),
        KEY idx_privacy_consents_anonymous (anonymous_id, created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
  },
};
