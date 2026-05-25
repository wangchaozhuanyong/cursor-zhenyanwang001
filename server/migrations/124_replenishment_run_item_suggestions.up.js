module.exports = {
  async up(query) {
    const addColumn = async (sql) => {
      await query(sql).catch((e) => { if (e.code !== 'ER_DUP_FIELDNAME') throw e; });
    };
    const addIndex = async (sql) => {
      await query(sql).catch((e) => { if (e.code !== 'ER_DUP_KEYNAME') throw e; });
    };

    await addColumn(`ALTER TABLE inventory_replenishment_run_items ADD COLUMN suggestion_type VARCHAR(32) NOT NULL DEFAULT 'purchase' AFTER confidence_score`);
    await addColumn(`ALTER TABLE inventory_replenishment_run_items ADD COLUMN suggestion_payload JSON NULL AFTER suggestion_type`);
    await addIndex(`CREATE INDEX idx_replenishment_run_items_suggestion_type ON inventory_replenishment_run_items(suggestion_type)`);
  },
};
