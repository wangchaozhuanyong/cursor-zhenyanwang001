module.exports = {
  async up(query) {
    const addColumn = async (sql) => {
      await query(sql).catch((e) => { if (e.code !== 'ER_DUP_FIELDNAME') throw e; });
    };
    const addIndex = async (sql) => {
      await query(sql).catch((e) => { if (e.code !== 'ER_DUP_KEYNAME') throw e; });
    };

    await addColumn(`ALTER TABLE inventory_replenishment_alerts ADD COLUMN lower_limit INT NULL AFTER warning_stock`);
    await addColumn(`ALTER TABLE inventory_replenishment_alerts ADD COLUMN upper_limit INT NULL AFTER lower_limit`);
    await addColumn(`ALTER TABLE inventory_replenishment_alerts ADD COLUMN avg_daily_sales DECIMAL(10,4) NULL AFTER upper_limit`);
    await addColumn(`ALTER TABLE inventory_replenishment_alerts ADD COLUMN saleable_days INT NULL AFTER avg_daily_sales`);
    await addColumn(`ALTER TABLE inventory_replenishment_alerts ADD COLUMN estimated_days_left DECIMAL(10,2) NULL AFTER saleable_days`);
    await addColumn(`ALTER TABLE inventory_replenishment_alerts ADD COLUMN confidence_score INT NULL AFTER estimated_days_left`);
    await addColumn(`ALTER TABLE inventory_replenishment_alerts ADD COLUMN suggestion_type VARCHAR(32) NOT NULL DEFAULT 'purchase' AFTER confidence_score`);
    await addColumn(`ALTER TABLE inventory_replenishment_alerts ADD COLUMN strategy_snapshot JSON NULL AFTER suggestion_type`);
    await addIndex(`CREATE INDEX idx_replenishment_suggestion_type ON inventory_replenishment_alerts(suggestion_type)`);

    await query(`
      CREATE TABLE IF NOT EXISTS inventory_replenishment_profiles (
        id VARCHAR(36) PRIMARY KEY,
        variant_id VARCHAR(36) NOT NULL,
        auto_limit_enabled TINYINT(1) NOT NULL DEFAULT 1,
        analysis_days INT NOT NULL DEFAULT 30,
        lead_time_days INT NOT NULL DEFAULT 7,
        safety_stock_days INT NOT NULL DEFAULT 3,
        target_cover_days INT NOT NULL DEFAULT 20,
        min_floor_stock INT NOT NULL DEFAULT 0,
        purchase_multiple INT NOT NULL DEFAULT 1,
        exclude_promotion_sales TINYINT(1) NOT NULL DEFAULT 0,
        exclude_stockout_days TINYINT(1) NOT NULL DEFAULT 1,
        strategy VARCHAR(32) NOT NULL DEFAULT 'balanced',
        updated_by VARCHAR(36) NULL,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uk_replenishment_profile_variant (variant_id),
        KEY idx_replenishment_profile_strategy (strategy),
        CONSTRAINT fk_replenishment_profile_variant FOREIGN KEY (variant_id) REFERENCES product_variants(id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS inventory_replenishment_runs (
        id VARCHAR(36) PRIMARY KEY,
        scope_type VARCHAR(32) NOT NULL,
        scope_snapshot JSON NULL,
        analysis_days INT NOT NULL,
        strategy VARCHAR(32) NOT NULL,
        status VARCHAR(32) NOT NULL DEFAULT 'preview',
        created_by VARCHAR(36) NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        KEY idx_replenishment_runs_status (status, created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS inventory_replenishment_run_items (
        id VARCHAR(36) PRIMARY KEY,
        run_id VARCHAR(36) NOT NULL,
        variant_id VARCHAR(36) NOT NULL,
        old_lower_limit INT NULL,
        old_upper_limit INT NULL,
        suggested_lower_limit INT NOT NULL,
        suggested_upper_limit INT NOT NULL,
        current_stock INT NOT NULL,
        available_stock INT NOT NULL,
        in_transit_qty INT NOT NULL DEFAULT 0,
        sales_qty INT NOT NULL DEFAULT 0,
        saleable_days INT NOT NULL DEFAULT 0,
        avg_daily_sales DECIMAL(10,4) NOT NULL DEFAULT 0,
        suggested_replenishment_qty INT NOT NULL DEFAULT 0,
        confidence_score INT NOT NULL DEFAULT 0,
        reason VARCHAR(255) NULL,
        apply_status VARCHAR(32) NOT NULL DEFAULT 'pending',
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        KEY idx_replenishment_run_items_run (run_id, apply_status),
        KEY idx_replenishment_run_items_variant (variant_id),
        CONSTRAINT fk_replenishment_run_item_run FOREIGN KEY (run_id) REFERENCES inventory_replenishment_runs(id),
        CONSTRAINT fk_replenishment_run_item_variant FOREIGN KEY (variant_id) REFERENCES product_variants(id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS inventory_daily_snapshots (
        id VARCHAR(36) PRIMARY KEY,
        snapshot_date DATE NOT NULL,
        product_id VARCHAR(36) NOT NULL,
        variant_id VARCHAR(36) NOT NULL,
        stock INT NOT NULL DEFAULT 0,
        reserved_stock INT NOT NULL DEFAULT 0,
        available_stock INT NOT NULL DEFAULT 0,
        in_transit_qty INT NOT NULL DEFAULT 0,
        sales_qty INT NOT NULL DEFAULT 0,
        is_stockout TINYINT(1) NOT NULL DEFAULT 0,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uk_inventory_daily_snapshot (snapshot_date, variant_id),
        KEY idx_inventory_daily_variant_date (variant_id, snapshot_date),
        KEY idx_inventory_daily_product_date (product_id, snapshot_date),
        CONSTRAINT fk_inventory_daily_product FOREIGN KEY (product_id) REFERENCES products(id),
        CONSTRAINT fk_inventory_daily_variant FOREIGN KEY (variant_id) REFERENCES product_variants(id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await addColumn(`ALTER TABLE inventory_conversion_orders ADD COLUMN parent_cost_before DECIMAL(10,2) NULL AFTER child_after_stock`);
    await addColumn(`ALTER TABLE inventory_conversion_orders ADD COLUMN parent_cost_after DECIMAL(10,2) NULL AFTER parent_cost_before`);
    await addColumn(`ALTER TABLE inventory_conversion_orders ADD COLUMN child_cost_before DECIMAL(10,2) NULL AFTER parent_cost_after`);
    await addColumn(`ALTER TABLE inventory_conversion_orders ADD COLUMN child_cost_after DECIMAL(10,2) NULL AFTER child_cost_before`);
    await addColumn(`ALTER TABLE inventory_conversion_orders ADD COLUMN cost_allocation_method VARCHAR(32) NULL AFTER child_cost_after`);
  },
};
